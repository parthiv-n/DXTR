#pragma once
#include <stdint.h>

typedef struct {
    float resistance;
    float voltage;
    uint16_t raw;
} FSRButtonData;

void fsrbutton_init();
FSRButtonData fsrbutton_read();
