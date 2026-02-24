#include <Arduino.h>
#include "sensors/imu.h"

void setup() {
    Serial.begin(115200);
    imu_init();
}

void loop() {
    IMUData data = imu_read();
    
    Serial.print("Roll: "); Serial.print(data.roll);
    Serial.print(" Pitch: "); Serial.println(data.pitch);
    
    delay(200);
}