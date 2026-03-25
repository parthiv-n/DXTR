#pragma once

typedef struct {
    float distanceCm;
    bool  outOfRange;
} UltrasoundData;

void ultrasound_init();
UltrasoundData ultrasound_read();
void ultrasound_sleep();
void ultrasound_wake();
