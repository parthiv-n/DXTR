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

// Session zero offsets
static float rollOffset  = 0;
static float pitchOffset = 0;
static float roll2Offset = 0;

static bool initSingleIMU(ICM_20948_I2C &imu, int adVal, const char* name) {
  ICM_20948_Status_e status = imu.begin(WIRE_PORT, adVal);
  if (status != ICM_20948_Stat_Ok) {
    Serial.print(name); Serial.println(" not found");
    return false;
  }
  Serial.print(name); Serial.println(" found!");
  delay(1000);

  if (imu.initializeDMP() != ICM_20948_Stat_Ok) {
    Serial.print(name); Serial.println(" initializeDMP failed");
    return false;
  }
  if (imu.enableDMPSensor(INV_ICM20948_SENSOR_GAME_ROTATION_VECTOR) != ICM_20948_Stat_Ok) {
    Serial.print(name); Serial.println(" enableDMPSensor failed");
    return false;
  }
  if (imu.setDMPODRrate(DMP_ODR_Reg_Quat6, 0) != ICM_20948_Stat_Ok) {
    Serial.print(name); Serial.println(" setDMPODRrate failed");
    return false;
  }

  if (imu.enableFIFO() != ICM_20948_Stat_Ok) { return false; }
  if (imu.enableDMP()  != ICM_20948_Stat_Ok) { return false; }
  if (imu.resetDMP()   != ICM_20948_Stat_Ok) { return false; }
  if (imu.resetFIFO()  != ICM_20948_Stat_Ok) { return false; }

  Serial.print(name); Serial.println(" DMP ready!");
  return true;
}

static void readQuatFromIMU(ICM_20948_I2C &imu, float &roll, float &pitch) {
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
  initSingleIMU(myICM2, AD0_VAL_IMU2, "IMU2 (wrist radial)");

  Serial.println("Both IMUs ready!");
}

void imu_zero() {
  // 15 second hold - median used to handle stroke patient tremor
  Serial.println("Hold still for 15 seconds...");

  const int MAX_SAMPLES = 750;

  static float rollSamples[MAX_SAMPLES];
  static float pitchSamples[MAX_SAMPLES];
  static float roll2Samples[MAX_SAMPLES];
  int count = 0;

  unsigned long startTime = millis();

  while (millis() - startTime < 15000 && count < MAX_SAMPLES) {
    float roll1 = 0, pitch1 = 0;
    float roll2 = 0, pitch2 = 0;

    readQuatFromIMU(myICM1, roll1, pitch1);
    readQuatFromIMU(myICM2, roll2, pitch2);

    if (roll1 != 0 || pitch1 != 0) {
      rollSamples[count]  = roll1;
      pitchSamples[count] = pitch1;
      roll2Samples[count] = roll2;
      count++;
    }

    delay(20);
  }

  std::sort(rollSamples,  rollSamples  + count);
  std::sort(pitchSamples, pitchSamples + count);
  std::sort(roll2Samples, roll2Samples + count);

  int mid    = count / 2;
  rollOffset  = rollSamples[mid];
  pitchOffset = pitchSamples[mid];
  roll2Offset = roll2Samples[mid];

  Serial.println("Ready!");
}

IMUData imu_read() {
  IMUData data = {0};

  float roll1 = 0, pitch1 = 0;
  float roll2 = 0, pitch2 = 0;

  readQuatFromIMU(myICM1, roll1, pitch1);
  readQuatFromIMU(myICM2, roll2, pitch2);

  // Apply session zero offsets
  data.roll      = roll1  - rollOffset;
  data.pitch     = pitch1 - pitchOffset;
  data.deviation = roll2  - roll2Offset;

  // Gyroscope data from IMU1
  if (myICM1.dataReady()) {
    myICM1.getAGMT();
    data.gx = myICM1.gyrX();
    data.gy = myICM1.gyrY();
    data.gz = myICM1.gyrZ();
  }

  return data;
}