#pragma once
#include <stdint.h>

typedef struct {
    float roll;
    float pitch;
    float deviation;
    float gx, gy, gz;
    float mx, my, mz;
} IMUData;
