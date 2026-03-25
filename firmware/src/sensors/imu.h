#pragma once
#include "sensors.h"

void imu_init();
void imu_zero();
IMUData imu_read();
void imu_sleep();
void imu_wake();
bool imu_is_calibrating();
