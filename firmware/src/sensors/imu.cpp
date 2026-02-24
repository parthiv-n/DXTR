#include "imu.h"
#include <Wire.h>
#include <math.h>
#include "ICM_20948.h" 

#define WIRE_PORT Wire

// SparkFun 9DoF IMU Breakout default: AD0_VAL = 1 -> I2C addr 0x69
// If you close the ADR jumper: AD0_VAL = 0 -> I2C addr 0x68
#define AD0_VAL 1

ICM_20948_I2C myICM;

void imu_init() {
  Serial.begin(115200);
  delay(100);

  Serial.println("SparkFun ICM-20948 (9DoF) test!");

  // ESP32 Thing Plus default I2C pins:
  // SDA = GPIO21, SCL = GPIO22
  WIRE_PORT.begin(21, 22);

  // Optional: faster I2C (often OK with Qwiic)
  WIRE_PORT.setClock(400000);

  // Start the IMU
  ICM_20948_Status_e status = myICM.begin(WIRE_PORT, AD0_VAL);

  if (status != ICM_20948_Stat_Ok) {
    Serial.print("Failed to find ICM-20948. Status: ");
    Serial.println((int)status);
    while (1) { delay(10); }
  }

  Serial.println("ICM-20948 Found!");
  Serial.println("Streaming Acc (m/s^2), Roll/Pitch (deg), Gyro (dps), Mag (uT)");
}

IMUData imu_read() {
  IMUData data = {0};

  if (myICM.dataReady()) {
    myICM.getAGMT(); // updates accel/gyro/mag/temp

    // SparkFun library accel units are mg by default
    // Convert mg -> m/s^2: (mg / 1000) * 9.80665
    const float g = 9.80665f;

    float ax = (myICM.accX() / 1000.0f) * g;
    float ay = (myICM.accY() / 1000.0f) * g;
    float az = (myICM.accZ() / 1000.0f) * g;

    data.roll  = atan2f(ay, az) * 180.0f / PI;
    data.pitch = atan2f(-ax, sqrtf(ay*ay + az*az)) * 180.0f / PI;
    data.gx = myICM.gyrX();
    data.gy = myICM.gyrY();
    data.gz = myICM.gyrZ();
    data.mx = myICM.magX();
    data.my = myICM.magY();
    data.mz = myICM.magZ();
  } 

  return data;

}