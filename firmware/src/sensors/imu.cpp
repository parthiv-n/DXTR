#include "imu.h"
#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include <algorithm>
#include "ICM_20948.h"

#define WIRE_PORT Wire
#define AD0_VAL_IMU1 1  // I2C addr 0x69
#define AD0_VAL_IMU2 0  // I2C addr 0x68

ICM_20948_I2C myICM1;
ICM_20948_I2C myICM2;

static bool _imu1_ok = false;
static bool _imu2_ok = false;
static bool _sleeping = false;
static bool _calibrating = false;

static float rollOffset  = 0;
static float pitchOffset = 0;
static float pitch2Offset = 0;

// IMU2 reference quaternion for deviation
static float qRef[4] = {1.0f, 0.0f, 0.0f, 0.0f};

static bool initSingleIMU(ICM_20948_I2C &imu, int adVal, const char* name) {
    ICM_20948_Status_e status = imu.begin(WIRE_PORT, adVal);
    if (status != ICM_20948_Stat_Ok) {
        Serial.print(name); Serial.println(" not found");
        return false;
    }
    Serial.print(name); Serial.println(" found!");
    delay(1000);

    if (imu.initializeDMP() != ICM_20948_Stat_Ok) {
        Serial.print(name); Serial.println(" ERROR: initializeDMP failed");
        return false;
    }

    if (imu.enableDMPSensor(INV_ICM20948_SENSOR_GAME_ROTATION_VECTOR) != ICM_20948_Stat_Ok) {
        Serial.print(name); Serial.println(" ERROR: enableDMPSensor failed");
        return false;
    }

    if (imu.setDMPODRrate(DMP_ODR_Reg_Quat6, 0) != ICM_20948_Stat_Ok) {
        Serial.print(name); Serial.println(" ERROR: setDMPODRrate failed");
        return false;
    }

    if (imu.enableFIFO() != ICM_20948_Stat_Ok) {
        Serial.print(name); Serial.println(" ERROR: enableFIFO failed");
        return false;
    }
    if (imu.enableDMP() != ICM_20948_Stat_Ok) {
        Serial.print(name); Serial.println(" ERROR: enableDMP failed");
        return false;
    }
    if (imu.resetDMP() != ICM_20948_Stat_Ok) {
        Serial.print(name); Serial.println(" ERROR: resetDMP failed");
        return false;
    }
    if (imu.resetFIFO() != ICM_20948_Stat_Ok) {
        Serial.print(name); Serial.println(" ERROR: resetFIFO failed");
        return false;
    }

    Serial.print(name); Serial.println(" DMP ready!");
    return true;
}

static void readQuatFromIMU(ICM_20948_I2C &imu, float &roll, float &pitch,
                             float* qOut = nullptr) {
    icm_20948_DMP_data_t dmpData;
    imu.readDMPdataFromFIFO(&dmpData);

    if ((imu.status == ICM_20948_Stat_Ok ||
         imu.status == ICM_20948_Stat_FIFOMoreDataAvail) &&
        (dmpData.header & DMP_header_bitmap_Quat6)) {

        double q1 = ((double)dmpData.Quat6.Data.Q1) / 1073741824.0;
        double q2 = ((double)dmpData.Quat6.Data.Q2) / 1073741824.0;
        double q3 = ((double)dmpData.Quat6.Data.Q3) / 1073741824.0;

        double q0Sq = 1.0 - (q1*q1) - (q2*q2) - (q3*q3);
        double q0   = (q0Sq > 0.0) ? sqrt(q0Sq) : 0.0;

        if (qOut != nullptr) {
            qOut[0] = (float)q0;
            qOut[1] = (float)q1;
            qOut[2] = (float)q2;
            qOut[3] = (float)q3;
        }

        roll = atan2f(
            2.0f * (q0 * q1 + q2 * q3),
            1.0f - 2.0f * (q1*q1 + q2*q2)
        ) * 180.0f / PI;

        float sinPitch = 2.0f * (q0 * q2 - q3 * q1);
        sinPitch = fmaxf(-1.0f, fminf(1.0f, sinPitch));
        pitch = asinf(sinPitch) * 180.0f / PI;
    }
}

void imu_init() {
    Serial.begin(115200);
    delay(100);

    Serial.println("Initialising IMUs...");

    WIRE_PORT.begin(21, 22);
    WIRE_PORT.setClock(400000);

    _imu1_ok = initSingleIMU(myICM1, AD0_VAL_IMU1, "IMU1 (hand dorsum)");
    _imu2_ok = initSingleIMU(myICM2, AD0_VAL_IMU2, "IMU2 (hand dorsum 90deg)");

    _sleeping = false;
    Serial.println("Both IMUs ready!");
}

void imu_zero() {
    _calibrating = true;
    Serial.println("Calibrating: hold still for 10 seconds...");

    const int MAX_SAMPLES = 500;

    static float rollSamples[MAX_SAMPLES];
    static float pitchSamples[MAX_SAMPLES];
    static float pitch2Samples[MAX_SAMPLES];
    int count = 0;

    float qSumW = 0, qSumX = 0, qSumY = 0, qSumZ = 0;
    int qCount = 0;

    unsigned long startTime = millis();

    while (millis() - startTime < 10000 && count < MAX_SAMPLES) {
        float roll1 = 0, pitch1 = 0;
        float roll2 = 0, pitch2 = 0;
        float q2[4] = {1.0f, 0.0f, 0.0f, 0.0f};

        readQuatFromIMU(myICM1, roll1, pitch1);
        delay(5);
        readQuatFromIMU(myICM2, roll2, pitch2, q2);

        if (roll1 != 0 || pitch1 != 0) {
            rollSamples[count]   = roll1;
            pitchSamples[count]  = pitch1;
            pitch2Samples[count] = pitch2;
            count++;
        }

        if (q2[0] != 1.0f || q2[1] != 0.0f) {
            qSumW += q2[0];
            qSumX += q2[1];
            qSumY += q2[2];
            qSumZ += q2[3];
            qCount++;
        }

        delay(20);
    }

    std::sort(rollSamples,   rollSamples   + count);
    std::sort(pitchSamples,  pitchSamples  + count);
    std::sort(pitch2Samples, pitch2Samples + count);

    int mid      = count / 2;
    rollOffset   = rollSamples[mid];
    pitchOffset  = pitchSamples[mid];
    pitch2Offset = pitch2Samples[mid];

    if (qCount > 0) {
        float w = qSumW / qCount;
        float x = qSumX / qCount;
        float y = qSumY / qCount;
        float z = qSumZ / qCount;
        float norm = sqrtf(w*w + x*x + y*y + z*z);
        qRef[0] = w / norm;
        qRef[1] = x / norm;
        qRef[2] = y / norm;
        qRef[3] = z / norm;
    }

    _calibrating = false;
    Serial.print("Calibration done. Samples: ");
    Serial.println(count);
}

bool imu_is_calibrating() {
    return _calibrating;
}

IMUData imu_read() {
    IMUData data = {0};
    if (_sleeping || _calibrating) return data;

    float roll1 = 0, pitch1 = 0;
    float roll2 = 0, pitch2 = 0;
    float q2[4] = {1.0f, 0.0f, 0.0f, 0.0f};

    readQuatFromIMU(myICM1, roll1, pitch1);
    readQuatFromIMU(myICM2, roll2, pitch2, q2);

    data.roll  = roll1  - rollOffset;
    data.pitch = pitch1 - pitchOffset;

    // Relative quaternion: q_rel = q_ref_conjugate * q_current
    float qRel[4];
    qRel[0] =  qRef[0]*q2[0] + qRef[1]*q2[1] + qRef[2]*q2[2] + qRef[3]*q2[3];
    qRel[1] =  qRef[0]*q2[1] - qRef[1]*q2[0] - qRef[2]*q2[3] + qRef[3]*q2[2];
    qRel[2] =  qRef[0]*q2[2] + qRef[1]*q2[3] - qRef[2]*q2[0] - qRef[3]*q2[1];
    qRel[3] =  qRef[0]*q2[3] - qRef[1]*q2[2] + qRef[2]*q2[1] - qRef[3]*q2[0];

    data.deviation = 2.0f * asinf(fmaxf(-1.0f, fminf(1.0f, qRel[3]))) * 180.0f / PI;

    if (myICM1.dataReady()) {
        myICM1.getAGMT();
        data.gx = myICM1.gyrX();
        data.gy = myICM1.gyrY();
        data.gz = myICM1.gyrZ();
    }

    return data;
}

void imu_sleep() {
    if (_sleeping) return;
    _sleeping = true;
    if (_imu1_ok) myICM1.sleep(true);
    if (_imu2_ok) myICM2.sleep(true);
    Serial.println("IMUs -> sleep");
}

void imu_wake() {
    if (!_sleeping) return;
    _sleeping = false;
    if (_imu1_ok) myICM1.sleep(false);
    if (_imu2_ok) myICM2.sleep(false);
    delay(50);
    Serial.println("IMUs -> wake");
}
