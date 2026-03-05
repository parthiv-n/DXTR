#include "imu.h"
#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include "ICM_20948.h" 

#define WIRE_PORT Wire

// SparkFun 9DoF IMU Breakout default: AD0_VAL = 1 -> I2C addr 0x69
// If you close the ADR jumper: AD0_VAL = 0 -> I2C addr 0x68
#define AD0_VAL 1

ICM_20948_I2C myICM;

static float magOffsetX = 0, magOffsetY = 0, magOffsetZ = 0;
static float magScaleX = 1, magScaleY = 1, magScaleZ = 1;

void imu_init() {
  Serial.begin(115200);
  delay(100);

  Serial.println("SparkFun ICM-20948 (9DoF) test!");

  WIRE_PORT.begin(21, 22);
  WIRE_PORT.setClock(400000);

  ICM_20948_Status_e status = myICM.begin(WIRE_PORT, AD0_VAL);

  if (status != ICM_20948_Stat_Ok) {
    Serial.print("Failed to find ICM-20948. Status: ");
    Serial.println((int)status);
    while (1) { delay(10); }
  }

  Serial.println("ICM-20948 Found!");
  delay(1000);

  if (myICM.initializeDMP() != ICM_20948_Stat_Ok) {
    Serial.println("initializeDMP failed");
    while(1) { delay(10); }
  }
  Serial.println("initializeDMP OK");

  // 9-axis fusion - accel + gyro + magnetometer
  if (myICM.enableDMPSensor(INV_ICM20948_SENSOR_GAME_ROTATION_VECTOR) != ICM_20948_Stat_Ok) {
    Serial.println("enableDMPSensor failed");
    while(1) { delay(10); }
  }
  Serial.println("enableDMPSensor OK");

  // Quat6 output rate
  if (myICM.setDMPODRrate(DMP_ODR_Reg_Quat6, 0) != ICM_20948_Stat_Ok) {
    Serial.println("setDMPODRrate failed");
    while(1) { delay(10); }
  }
  Serial.println("setDMPODRrate OK");

  if (myICM.enableFIFO() != ICM_20948_Stat_Ok) {
    Serial.println("enableFIFO failed");
    while(1) { delay(10); }
  }
  Serial.println("enableFIFO OK");

  if (myICM.enableDMP() != ICM_20948_Stat_Ok) {
    Serial.println("enableDMP failed");
    while(1) { delay(10); }
  }
  Serial.println("enableDMP OK");

  if (myICM.resetDMP() != ICM_20948_Stat_Ok) {
    Serial.println("resetDMP failed");
    while(1) { delay(10); }
  }
  Serial.println("resetDMP OK");

  if (myICM.resetFIFO() != ICM_20948_Stat_Ok) {
    Serial.println("resetFIFO failed");
    while(1) { delay(10); }
  }
  Serial.println("resetFIFO OK");

  // Explicitly start magnetometer in continuous mode
  myICM.startupMagnetometer();

  Serial.println("ICM-20948 with DMP ready!");
  Serial.println("Streaming quaternion-derived Roll/Pitch/Yaw (deg)");
}

void imu_calibrate_mag() {
  Serial.println("Magnetometer calibration starting...");
  Serial.println("Rotate the sensor slowly in a figure-8 pattern");
  Serial.println("You have 15 seconds...");

  float minX =  99999, minY =  99999, minZ =  99999;
  float maxX = -99999, maxY = -99999, maxZ = -99999;

  unsigned long startTime = millis();

  while (millis() - startTime < 15000) {
    if (myICM.dataReady()) {
      myICM.getAGMT();

      float mx = myICM.magX();
      float my = myICM.magY();
      float mz = myICM.magZ();

      if (mx < minX) minX = mx;
      if (mx > maxX) maxX = mx;
      if (my < minY) minY = my;
      if (my > maxY) maxY = my;
      if (mz < minZ) minZ = mz;
      if (mz > maxZ) maxZ = mz;

      Serial.print("X: "); Serial.print(mx);
      Serial.print(" Y: "); Serial.print(my);
      Serial.print(" Z: "); Serial.println(mz);

      delay(50);
    }
  }

  magOffsetX = (maxX + minX) / 2.0f;
  magOffsetY = (maxY + minY) / 2.0f;
  magOffsetZ = (maxZ + minZ) / 2.0f;

  float rangeX = (maxX - minX) / 2.0f;
  float rangeY = (maxY - minY) / 2.0f;
  float rangeZ = (maxZ - minZ) / 2.0f;
  float avgRange = (rangeX + rangeY + rangeZ) / 3.0f;

  magScaleX = avgRange / rangeX;
  magScaleY = avgRange / rangeY;
  magScaleZ = avgRange / rangeZ;

  Serial.println("Calibration complete!");
  Serial.print("Offsets - X: "); Serial.print(magOffsetX);
  Serial.print(" Y: "); Serial.print(magOffsetY);
  Serial.print(" Z: "); Serial.println(magOffsetZ);
  Serial.print("Scales  - X: "); Serial.print(magScaleX);
  Serial.print(" Y: "); Serial.print(magScaleY);
  Serial.print(" Z: "); Serial.println(magScaleZ);
}

IMUData imu_read() {
  IMUData data = {0};

  icm_20948_DMP_data_t dmpData;
  myICM.readDMPdataFromFIFO(&dmpData);

  // Both statuses accepted - FIFOMoreDataAvail means valid data
  // but more packets are still queued behind it
  if ((myICM.status == ICM_20948_Stat_Ok || 
       myICM.status == ICM_20948_Stat_FIFOMoreDataAvail) &&
      (dmpData.header & DMP_header_bitmap_Quat6)) {  // Quat6 matches init

    double q1 = ((double)dmpData.Quat6.Data.Q1) / 1073741824.0;
    double q2 = ((double)dmpData.Quat6.Data.Q2) / 1073741824.0;
    double q3 = ((double)dmpData.Quat6.Data.Q3) / 1073741824.0;

    double q0Squared = 1.0 - (q1*q1) - (q2*q2) - (q3*q3);
    double q0 = (q0Squared > 0.0) ? sqrt(q0Squared) : 0.0;

    // Roll and pitch from DMP quaternion
    data.roll = atan2f(
      2.0f * (q0 * q1 + q2 * q3),
      1.0f - 2.0f * (q1*q1 + q2*q2)
    ) * 180.0f / PI;

    float sinPitch = 2.0f * (q0 * q2 - q3 * q1);
    sinPitch = fmaxf(-1.0f, fminf(1.0f, sinPitch));
    data.pitch = asinf(sinPitch) * 180.0f / PI;

    // Fetch raw sensor data for magnetometer
    myICM.getAGMT();
    data.gx = myICM.gyrX();
    data.gy = myICM.gyrY();
    data.gz = myICM.gyrZ();
    data.mx = myICM.magX();
    data.my = myICM.magY();
    data.mz = myICM.magZ();

    // Apply calibration corrections to magnetometer
    float mxCal = (data.mx - magOffsetX) * magScaleX;
    float myCal = (data.my - magOffsetY) * magScaleY;
    float mzCal = (data.mz - magOffsetZ) * magScaleZ;

    float rollRad  = data.roll  * PI / 180.0f;
    float pitchRad = data.pitch * PI / 180.0f;

    // Tilt compensated yaw from calibrated magnetometer
    float magXcomp = mxCal * cosf(pitchRad)
                   + myCal * sinf(rollRad) * sinf(pitchRad)
                   - mzCal * cosf(rollRad) * sinf(pitchRad);

    float magYcomp = myCal * cosf(rollRad)
                   + mzCal * sinf(rollRad);

    data.yaw = atan2f(-magYcomp, magXcomp) * 180.0f / PI;
  }

  return data;
}