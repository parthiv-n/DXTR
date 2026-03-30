#include "imu.h"
#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include <algorithm>
#include "ICM_20948.h"
#define IMU_DEBUG true

#define WIRE_PORT Wire
#define AD0_VAL_IMU1 1  // I2C addr 0x69
#define AD0_VAL_IMU2 0  // I2C addr 0x68

ICM_20948_I2C myICM1;
ICM_20948_I2C myICM2;

// Session zero offsets
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
  Serial.print(name); Serial.println(" DMP initialised");

  if (imu.enableDMPSensor(INV_ICM20948_SENSOR_GAME_ROTATION_VECTOR) != ICM_20948_Stat_Ok) {
    Serial.print(name); Serial.println(" ERROR: enableDMPSensor failed");
    return false;
  }
  Serial.print(name); Serial.println(" Game Rotation Vector enabled");

  if (imu.setDMPODRrate(DMP_ODR_Reg_Quat6, 0) != ICM_20948_Stat_Ok) {
    Serial.print(name); Serial.println(" ERROR: setDMPODRrate failed");
    return false;
  }
  Serial.print(name); Serial.println(" ODR rate set");

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

    // Store raw quaternion if requested
    if (qOut != nullptr) {
      qOut[0] = (float)q0; // w
      qOut[1] = (float)q1; // x
      qOut[2] = (float)q2; // y
      qOut[3] = (float)q3; // z
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

  initSingleIMU(myICM1, AD0_VAL_IMU1, "IMU1 (hand dorsum)");
  initSingleIMU(myICM2, AD0_VAL_IMU2, "IMU2 (hand dorsum 90deg)");

  Serial.println("Both IMUs ready!");
}

void imu_zero() {
  Serial.println("Hold still for 15 seconds...");

  const int MAX_SAMPLES = 750;

  static float rollSamples[MAX_SAMPLES];
  static float pitchSamples[MAX_SAMPLES];
  static float pitch2Samples[MAX_SAMPLES];
  int count = 0;

  // For reference quaternion averaging
  float qSumW = 0, qSumX = 0, qSumY = 0, qSumZ = 0;
  int qCount = 0;

  unsigned long startTime = millis();

  while (millis() - startTime < 15000 && count < MAX_SAMPLES) {
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

    // Accumulate IMU2 quaternion for averaging
    if (q2[0] != 1.0f || q2[1] != 0.0f) {
      qSumW += q2[0];
      qSumX += q2[1];
      qSumY += q2[2];
      qSumZ += q2[3];
      qCount++;
    }

    delay(20);
  }

  // Sort and take median for IMU1
  std::sort(rollSamples,   rollSamples   + count);
  std::sort(pitchSamples,  pitchSamples  + count);
  std::sort(pitch2Samples, pitch2Samples + count);

  int mid      = count / 2;
  rollOffset   = rollSamples[mid];
  pitchOffset  = pitchSamples[mid];
  pitch2Offset = pitch2Samples[mid];

  // Normalise averaged quaternion for IMU2 reference
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

  Serial.println("Ready!");
}

IMUData imu_read() {
  IMUData data = {0};

  float roll1 = 0, pitch1 = 0;
  float roll2 = 0, pitch2 = 0;
  float q2[4] = {1.0f, 0.0f, 0.0f, 0.0f};

  readQuatFromIMU(myICM1, roll1, pitch1);
  readQuatFromIMU(myICM2, roll2, pitch2, q2);

  // Apply session zero offsets for IMU1
  data.roll  = roll1  - rollOffset;
  data.pitch = pitch1 - pitchOffset;

  // Compute relative quaternion: q_rel = q_ref_conjugate * q_current
  // Conjugate of qRef is (w, -x, -y, -z)
  float qRel[4];
  qRel[0] =  qRef[0]*q2[0] + qRef[1]*q2[1] + qRef[2]*q2[2] + qRef[3]*q2[3];
  qRel[1] =  qRef[0]*q2[1] - qRef[1]*q2[0] - qRef[2]*q2[3] + qRef[3]*q2[2];
  qRel[2] =  qRef[0]*q2[2] + qRef[1]*q2[3] - qRef[2]*q2[0] - qRef[3]*q2[1];
  qRel[3] =  qRef[0]*q2[3] - qRef[1]*q2[2] + qRef[2]*q2[1] - qRef[3]*q2[0];

  if (IMU_DEBUG) {
    Serial.print("IMU1 -> roll1: "); Serial.print(roll1);
    Serial.print("  pitch1: ");      Serial.println(pitch1);
    Serial.print("qRel -> w: ");     Serial.print(qRel[0]);
    Serial.print("  x: ");           Serial.print(qRel[1]);
    Serial.print("  y: ");           Serial.print(qRel[2]);
    Serial.print("  z: ");           Serial.println(qRel[3]);
  }

  // Use z component
  data.deviation = 2.0f * asinf(fmaxf(-1.0f, fminf(1.0f, qRel[3]))) * 180.0f / PI;

  // Gyroscope data from IMU1
  if (myICM1.dataReady()) {
    myICM1.getAGMT();
    data.gx = myICM1.gyrX();
    data.gy = myICM1.gyrY();
    data.gz = myICM1.gyrZ();
  }

  return data;
}