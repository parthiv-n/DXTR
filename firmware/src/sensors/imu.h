#pragma once
#include "sensors.h"

void imu_init();
void imu_zero();
IMUData imu_read();
IMUData imu_read2();
void imu_sleep();
void imu_wake();
