#include "fsr_button2.h"
#include <Arduino.h>

#define FSR_BUTTON2_PIN 39
#define PULLDOWN_R 22000.0f
#define ADC_MAX 4095.0f
#define VCC 3.3f

void fsrbutton2_init() {
    pinMode(FSR_BUTTON2_PIN, INPUT);
    Serial.println("FSR-402 button2 (GPIO 39) init");
}

FSRButton2Data fsrbutton2_read() {
    FSRButton2Data data = { 0.0f, 0.0f };
    int raw = analogRead(FSR_BUTTON2_PIN);
    data.voltage = (raw / ADC_MAX) * VCC;
    if (raw > 0) {
        data.resistance = PULLDOWN_R * (VCC / data.voltage - 1.0f);
    } else {
        data.resistance = 1000000.0f;
    }
    return data;
}
