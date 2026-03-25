#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "sensors/imu.h"
#include "sensors/fsr_button.h"
#include "sensors/fsr_button2.h"
#include "sensors/fsr_grip.h"
#include "sensors/ultrasound.h"
#include "sensors/sensor_manager.h"

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CMD_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"

BLEServer*         pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
BLECharacteristic* pCmdCharacteristic = nullptr;
bool bleClientConnected = false;

static String serialCmdBuffer = "";

class ServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* s)    override { bleClientConnected = true;  Serial.println("BLE client connected"); }
    void onDisconnect(BLEServer* s) override {
        bleClientConnected = false;
        Serial.println("BLE client disconnected");
        GameMode idle = MODE_IDLE;
        setGameMode(idle);
        s->startAdvertising();
    }
};

class CmdCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pChar) override {
        String val = pChar->getValue();
        if (val.length() == 0) return;
        GameMode mode;
        if (parseGameModeCommand(val.c_str(), mode)) {
            setGameMode(mode);
        }
    }
};

void setup() {
    Serial.begin(115200);
    delay(100);

    BLEDevice::init("DXTR-Controller");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService* pService = pServer->createService(SERVICE_UUID);

    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pCharacteristic->addDescriptor(new BLE2902());

    pCmdCharacteristic = pService->createCharacteristic(
        CMD_CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
    );
    pCmdCharacteristic->setCallbacks(new CmdCallbacks());

    pService->start();

    BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("BLE advertising as 'DXTR-Controller'");

    imu_init();
    imu_zero();
    fsrbutton_init();
    fsrbutton2_init();
    fsrgrip_init();
    ultrasound_init();

    imu_sleep();

    Serial.println("All sensors initialized. Mode: IDLE (sensors sleeping)");
}

static void processSerialCommands() {
    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\n' || c == '\r') {
            serialCmdBuffer.trim();
            if (serialCmdBuffer.length() > 0) {
                GameMode mode;
                if (parseGameModeCommand(serialCmdBuffer.c_str(), mode)) {
                    setGameMode(mode);
                }
            }
            serialCmdBuffer = "";
        } else {
            serialCmdBuffer += c;
        }
    }
}

void loop() {
    processSerialCommands();

    GameMode mode = getCurrentMode();
    char json[300];

    switch (mode) {
        case MODE_CAR_RACER:
        case MODE_FOSSIL_FINDER: {
            IMUData d1 = imu_read();
            IMUData d2 = imu_read2();
            snprintf(json, sizeof(json),
                "{\"roll\":%.2f,\"pitch\":%.2f,\"deviation\":%.2f,"
                "\"gx\":%.2f,\"gy\":%.2f,\"gz\":%.2f,"
                "\"roll2\":%.2f,\"pitch2\":%.2f,\"deviation2\":%.2f,"
                "\"gx2\":%.2f,\"gy2\":%.2f,\"gz2\":%.2f}",
                d1.roll, d1.pitch, d1.deviation,
                d1.gx, d1.gy, d1.gz,
                d2.roll, d2.pitch, d2.deviation,
                d2.gx, d2.gy, d2.gz);
            break;
        }
        case MODE_ALIEN_ABDUCTION: {
            FSRButtonData fb = fsrbutton_read();
            FSRButton2Data fb2 = fsrbutton2_read();
            snprintf(json, sizeof(json),
                "{\"fsr\":%u,"
                "\"fsrbutton_resistance\":%.0f,\"fsrbutton_voltage\":%.3f,"
                "\"fsrbutton2_resistance\":%.0f,\"fsrbutton2_voltage\":%.3f}",
                fb.raw,
                fb.resistance, fb.voltage,
                fb2.resistance, fb2.voltage);
            break;
        }
        case MODE_STORM_WITCH: {
            FSRGripData fg = fsrgrip_read();
            snprintf(json, sizeof(json),
                "{\"fsrgrip_resistance\":%.0f,\"fsrgrip_voltage\":%.3f}",
                fg.resistance, fg.voltage);
            break;
        }
        case MODE_FLY_SWATTER: {
            UltrasoundData us = ultrasound_read();
            snprintf(json, sizeof(json),
                "{\"distance_cm\":%.2f,\"out_of_range\":%s}",
                us.distanceCm,
                us.outOfRange ? "true" : "false");
            break;
        }
        case MODE_IDLE:
        default: {
            snprintf(json, sizeof(json), "{\"mode\":\"idle\"}");
            break;
        }
    }

    Serial.println(json);

    if (bleClientConnected) {
        pCharacteristic->setValue(json);
        pCharacteristic->notify();
    }

    delay(mode == MODE_FLY_SWATTER ? 60 : 50);
}
