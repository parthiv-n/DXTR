#pragma once

typedef struct {
    float resistance;
    float voltage;
} FSRGripData;

void fsrgrip_init();
FSRGripData fsrgrip_read();
