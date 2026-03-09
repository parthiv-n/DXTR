#pragma once
#include "sensors.h"

void imu_init();
void imu_zero();
IMUData imu_read();