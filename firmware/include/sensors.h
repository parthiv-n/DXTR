#pragma once

typedef struct {
    float roll;
    float pitch;
    float deviation;
    float gx, gy, gz;
    float mx, my, mz;
} IMUData;

typedef struct {
    int adcValue;        // raw ADC reading 0-4095
    float voltage;       // converted voltage 0-3.3V
    float resistance;    // calculated FSR resistance in ohms
} FSRButtonData;

typedef struct {
    int adcValue;        // raw ADC reading 0-4095
    float voltage;       // converted voltage 0-3.3V
    float resistance;    // calculated FSR resistance in ohms
} FSRGripData;

typedef struct {
    float distanceCm;
    bool outOfRange;
} UltrasoundData;