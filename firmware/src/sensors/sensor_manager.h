#pragma once
#include <stdint.h>

enum GameMode : uint8_t {
    MODE_IDLE = 0,
    MODE_CAR_RACER,
    MODE_ALIEN_ABDUCTION,
    MODE_STORM_WITCH,
    MODE_FLY_SWATTER,
    MODE_FOSSIL_FINDER
};

GameMode getCurrentMode();
void setGameMode(GameMode mode);
bool parseGameModeCommand(const char* cmd, GameMode& outMode);

bool isSensorNeeded_IMU();
bool isSensorNeeded_FSRButton();
bool isSensorNeeded_FSRButton2();
bool isSensorNeeded_FSRGrip();
bool isSensorNeeded_Ultrasonic();
