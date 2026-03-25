#include "imu.h"
#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include "ICM_20948.h"

#define WIRE_PORT Wire

// IMU 1: ADR NOT soldered -> address 0x69 (AD0_VAL = 1)
// IMU 2: ADR IS soldered  -> address 0x68 (AD0_VAL = 0)
ICM_20948_I2C imu1;
ICM_20948_I2C imu2;

static bool _imu1_ok = false;
static bool _imu2_ok = false;
static bool _sleeping = false;

static float zeroRoll  = 0.0f;
static float zeroPitch = 0.0f;
static float zeroDev   = 0.0f;

static IMUData readSingle(ICM_20948_I2C& icm) {
    IMUData data = {0};
    if (icm.dataReady()) {
        icm.getAGMT();
        const float g = 9.80665f;
        float ax = (icm.accX() / 1000.0f) * g;
        float ay = (icm.accY() / 1000.0f) * g;
        float az = (icm.accZ() / 1000.0f) * g;

        data.roll  = atan2f(ay, az) * 180.0f / PI;
        data.pitch = atan2f(-ax, sqrtf(ay * ay + az * az)) * 180.0f / PI;
        data.deviation = atan2f(ax, az) * 180.0f / PI;
        data.gx = icm.gyrX();
        data.gy = icm.gyrY();
        data.gz = icm.gyrZ();
        data.mx = icm.magX();
        data.my = icm.magY();
        data.mz = icm.magZ();
    }
    return data;
}

void imu_init() {
    WIRE_PORT.begin(21, 22);
    WIRE_PORT.setClock(400000);

    ICM_20948_Status_e s1 = imu1.begin(WIRE_PORT, 1);
    _imu1_ok = (s1 == ICM_20948_Stat_Ok);
    Serial.println(_imu1_ok ? "IMU-1 (0x69) OK" : "IMU-1 (0x69) FAIL");

    ICM_20948_Status_e s2 = imu2.begin(WIRE_PORT, 0);
    _imu2_ok = (s2 == ICM_20948_Stat_Ok);
    Serial.println(_imu2_ok ? "IMU-2 (0x68) OK" : "IMU-2 (0x68) FAIL");

    _sleeping = false;
}

void imu_zero() {
    if (!_imu1_ok) return;
    IMUData snap = readSingle(imu1);
    zeroRoll  = snap.roll;
    zeroPitch = snap.pitch;
    zeroDev   = snap.deviation;
    Serial.println("IMU zeroed");
}

IMUData imu_read() {
    IMUData data = {0};
    if (_sleeping || !_imu1_ok) return data;
    data = readSingle(imu1);
    data.roll  -= zeroRoll;
    data.pitch -= zeroPitch;
    data.deviation -= zeroDev;
    return data;
}

IMUData imu_read2() {
    IMUData data = {0};
    if (_sleeping || !_imu2_ok) return data;
    data = readSingle(imu2);
    return data;
}

void imu_sleep() {
    if (_sleeping) return;
    _sleeping = true;
    if (_imu1_ok) imu1.sleep(true);
    if (_imu2_ok) imu2.sleep(true);
    Serial.println("IMUs -> sleep");
}

void imu_wake() {
    if (!_sleeping) return;
    _sleeping = false;
    if (_imu1_ok) imu1.sleep(false);
    if (_imu2_ok) imu2.sleep(false);
    delay(50);
    Serial.println("IMUs -> wake");
}
