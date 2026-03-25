#include "fsr_button.h"
#include <Arduino.h>

#define FSR_BUTTON_PIN 34
#define PULLDOWN_R 22000.0f
#define ADC_MAX 4095.0f
#define VCC 3.3f

void fsrbutton_init() {
    pinMode(FSR_BUTTON_PIN, INPUT);
    Serial.println("FSR-402 button (GPIO 34) init");
}

FSRButtonData fsrbutton_read() {
    FSRButtonData data = { 0.0f, 0.0f, 0 };
    int raw = analogRead(FSR_BUTTON_PIN);
    data.raw = (uint16_t)raw;
    data.voltage = (raw / ADC_MAX) * VCC;
    if (raw > 0) {
        data.resistance = PULLDOWN_R * (VCC / data.voltage - 1.0f);
    } else {
        data.resistance = 1000000.0f;
    }
    return data;
}
