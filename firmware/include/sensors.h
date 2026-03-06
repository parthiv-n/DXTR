#pragma once

typedef struct {
    float roll;
    float pitch;
    float yaw;
    float gx, gy, gz;
    float mx, my, mz;
    uint16_t fsr;    // FSR analog value (0-4095). Reads 0 until sensor is wired.
} IMUData;

typedef struct {
    int adcValue;        // raw ADC reading 0-4095
    float voltage;       // converted voltage 0-3.3V
    float resistance;    // calculated FSR resistance in ohms
} FSRData;

typedef struct {
    float distanceCm;
    bool outOfRange;
} UltrasoundData;