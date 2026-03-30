#include "fsr_button.h"
#include <Arduino.h>

#define FSR_PIN     33
#define VREF        3.3f
#define R_FIXED     10000.0f
#define ADC_MAX     4095

void fsrgrip_init() {
    analogReadResolution(12);
    Serial.println("FSR Grip initialised");
}

FSRGripData fsrgrip_read() {
    FSRGripData data;

    data.adcValue = analogRead(FSR_PIN);

    // Convert ADC to voltage
    data.voltage = (data.adcValue * VREF) / ADC_MAX;

    // Calculate FSR resistance using voltage divider equation
    // R_fsr = R_fixed * ((Vref / Vout) - 1)
    if (data.voltage < 0.01f) {
        data.resistance = 1e6f; // no force applied - treat as very high resistance
    } else {
        data.resistance = R_FIXED * ((VREF / data.voltage) - 1.0f);
    }

    return data;
}