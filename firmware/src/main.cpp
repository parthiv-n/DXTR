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

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer*         pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool bleClientConnected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s)    override { bleClientConnected = true;  Serial.println("BLE client connected");    }
  void onDisconnect(BLEServer* s) override { bleClientConnected = false; Serial.println("BLE client disconnected"); s->startAdvertising(); }
};

void setup() {
    Serial.begin(115200);
    delay(100);

    // BLE init
    BLEDevice::init("DXTR-Controller");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService* pService = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pCharacteristic->addDescriptor(new BLE2902());
    pService->start();

    BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("BLE advertising as 'DXTR-Controller'");

    // IMU init
    imu_init();
    imu_zero();

    // FSR Button 1 init
    fsrbutton_init();

    // FSR Button 2 init
    fsrbutton2_init();

    // FSR Grip init
    fsrgrip_init();

    // Ultrasound init
    ultrasound_init();
}

void loop() {
    IMUData imuData = imu_read();
    FSRButtonData fsrbuttonData = fsrbutton_read();
    FSRButton2Data fsrbutton2Data = fsrbutton2_read();
    FSRGripData fsrgripData = fsrgrip_read();
    UltrasoundData ultrasoundData = ultrasound_read();

    char json[220];
    snprintf(json, sizeof(json),
        "{\"roll\":%.2f,\"pitch\":%.2f,\"deviation\":%.2f,\"gx\":%.2f,\"gy\":%.2f,\"gz\":%.2f,\"fsrbutton_resistance\":%.0f,\"fsrbutton_voltage\":%.3f,\"fsrbutton2_resistance\":%.0f,\"fsrbutton2_voltage\":%.3f,\"fsrgrip_resistance\":%.0f,\"fsrgrip_voltage\":%.3f,\"distance\":%.2f,\"out_of_range\":%s}",
        imuData.roll, imuData.pitch, imuData.deviation,
        imuData.gx, imuData.gy, imuData.gz,
        fsrbuttonData.resistance, fsrbuttonData.voltage,
        fsrbutton2Data.resistance, fsrbutton2Data.voltage,
        fsrgripData.resistance, fsrgripData.voltage,
        ultrasoundData.distanceCm,
        ultrasoundData.outOfRange ? "true" : "false");

    Serial.println(json);

    if (bleClientConnected) {
        pCharacteristic->setValue(json);
        pCharacteristic->notify();
    }

    delay(100);
}
