#pragma once

typedef struct {
    float resistance;
    float voltage;
} FSRButton2Data;

void fsrbutton2_init();
FSRButton2Data fsrbutton2_read();
