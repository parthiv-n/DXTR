#pragma once
#include "sensors.h"

void imu_init();
void imu_calibrate_mag();
IMUData imu_read();