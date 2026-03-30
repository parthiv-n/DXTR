#include "ultrasound.h"
#include <Arduino.h>

#define TRIG_PIN 25
#define ECHO_PIN 32

void ultrasound_init() {
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    digitalWrite(TRIG_PIN, LOW);
    Serial.println("Ultrasonic initialised");
}

UltrasoundData ultrasound_read() {
    UltrasoundData data;

    // Send 10us trigger pulse
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    // Wait for echo - 38000us timeout means ~6.5m max range
    long duration = pulseIn(ECHO_PIN, HIGH, 38000);

    if (duration == 0) {
        data.distanceCm = 0;
        data.outOfRange = true;
    } else {
        // Speed of sound = 0.034 cm/us, divide by 2 for return journey
        data.distanceCm = duration * 0.034 / 2.0;
        data.outOfRange = false;
    }

    return data;
}