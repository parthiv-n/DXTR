#include "fsr_grip.h"
#include <Arduino.h>

#define FSR_GRIP_PIN 33
#define PULLDOWN_R 10000.0f
#define ADC_MAX 4095.0f
#define VCC 3.3f

void fsrgrip_init() {
    pinMode(FSR_GRIP_PIN, INPUT);
    Serial.println("FSR-406 grip (GPIO 33) init");
}

FSRGripData fsrgrip_read() {
    FSRGripData data = { 0.0f, 0.0f };
    int raw = analogRead(FSR_GRIP_PIN);
    data.voltage = (raw / ADC_MAX) * VCC;
    if (raw > 0) {
        data.resistance = PULLDOWN_R * (VCC / data.voltage - 1.0f);
    } else {
        data.resistance = 1000000.0f;
    }
    return data;
}
