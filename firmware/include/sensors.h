#pragma once

typedef struct {
    float roll;
    float pitch;
    float yaw;
    float gx, gy, gz;
    float mx, my, mz;
} IMUData;