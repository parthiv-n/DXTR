#pragma once

typedef struct {
    float roll;
    float pitch;
    float yaw;
    float gx, gy, gz;
    float mx, my, mz;
    uint16_t fsr;    // FSR analog value (0-4095). Reads 0 until sensor is wired.
} IMUData;