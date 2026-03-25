#include "ultrasound.h"
#include <Arduino.h>

#define TRIG_PIN 25
#define ECHO_PIN 32
#define MAX_DISTANCE_CM 400.0f
#define TIMEOUT_US 25000

static bool _awake = false;

void ultrasound_init() {
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    digitalWrite(TRIG_PIN, LOW);
    _awake = false;
    Serial.println("HC-SR04 initialized (sleeping until fly-swatter mode)");
}

UltrasoundData ultrasound_read() {
    UltrasoundData data = { 0.0f, true };
    if (!_awake) return data;

    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, TIMEOUT_US);

    if (duration == 0) {
        data.distanceCm = MAX_DISTANCE_CM;
        data.outOfRange = true;
    } else {
        data.distanceCm = (duration * 0.0343f) / 2.0f;
        data.outOfRange = (data.distanceCm > MAX_DISTANCE_CM);
        if (data.outOfRange) data.distanceCm = MAX_DISTANCE_CM;
    }

    return data;
}

void ultrasound_sleep() {
    _awake = false;
    digitalWrite(TRIG_PIN, LOW);
    Serial.println("HC-SR04 -> sleep");
}

void ultrasound_wake() {
    _awake = true;
    Serial.println("HC-SR04 -> wake");
}
