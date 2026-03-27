#include "sensor_manager.h"
#include "imu.h"
#include "ultrasound.h"
#include <Arduino.h>
#include <string.h>

static GameMode currentMode = MODE_IDLE;
static NotifyCallback _notifyCb = nullptr;

GameMode getCurrentMode() {
    return currentMode;
}

void setNotifyCallback(NotifyCallback cb) {
    _notifyCb = cb;
}

void setGameMode(GameMode mode) {
    bool forceCalibrate = (mode == MODE_FOSSIL_FINDER);
    if (mode == currentMode && !forceCalibrate) return;

    GameMode prevMode = currentMode;
    currentMode = mode;

    bool prevIMU = false, nowIMU = false;
    bool prevUS  = false, nowUS  = false;

    switch (prevMode) {
        case MODE_CAR_RACER:
        case MODE_FOSSIL_FINDER:
        case MODE_RHYTHM_REHAB:  prevIMU = true; break;
        case MODE_FLY_SWATTER:   prevUS  = true; break;
        default: break;
    }
    switch (currentMode) {
        case MODE_CAR_RACER:
        case MODE_FOSSIL_FINDER:
        case MODE_RHYTHM_REHAB:  nowIMU = true; break;
        case MODE_FLY_SWATTER:   nowUS  = true; break;
        default: break;
    }

    if (prevIMU && !nowIMU) {
        imu_sleep();
    } else if (!prevIMU && nowIMU) {
        imu_wake();
    }

    if (prevUS && !nowUS) {
        ultrasound_sleep();
    } else if (!prevUS && nowUS) {
        ultrasound_wake();
    }

    if (mode == MODE_FOSSIL_FINDER) {
        if (_notifyCb) _notifyCb("{\"calibrating\":true}");
        imu_zero();
    }

    Serial.print("Game mode -> ");
    Serial.println((int)currentMode);
}

bool parseGameModeCommand(const char* cmd, GameMode& outMode) {
    if (strncmp(cmd, "mode:", 5) != 0) return false;
    const char* name = cmd + 5;

    if (strcmp(name, "idle") == 0)              outMode = MODE_IDLE;
    else if (strcmp(name, "car-racer") == 0)    outMode = MODE_CAR_RACER;
    else if (strcmp(name, "alien-abduction") == 0) outMode = MODE_ALIEN_ABDUCTION;
    else if (strcmp(name, "storm-witch") == 0)  outMode = MODE_STORM_WITCH;
    else if (strcmp(name, "fly-swatter") == 0)  outMode = MODE_FLY_SWATTER;
    else if (strcmp(name, "fossil-finder") == 0) outMode = MODE_FOSSIL_FINDER;
    else if (strcmp(name, "rhythm-rehab") == 0) outMode = MODE_RHYTHM_REHAB;
    else return false;

    return true;
}

bool isSensorNeeded_IMU() {
    return currentMode == MODE_CAR_RACER || currentMode == MODE_FOSSIL_FINDER || currentMode == MODE_RHYTHM_REHAB;
}

bool isSensorNeeded_FSRButton() {
    return currentMode == MODE_ALIEN_ABDUCTION;
}

bool isSensorNeeded_FSRButton2() {
    return currentMode == MODE_ALIEN_ABDUCTION;
}

bool isSensorNeeded_FSRGrip() {
    return currentMode == MODE_STORM_WITCH;
}

bool isSensorNeeded_Ultrasonic() {
    return currentMode == MODE_FLY_SWATTER;
}
