// ESP32 ICM-20948 Game Controller for DXTR Therapy Game
// Sends roll, pitch, yaw data as JSON over:
//   1) Serial at 115200 baud (USB)
//   2) BLE notifications (Web Bluetooth)
// Uses SparkFun ICM-20948 library + built-in ESP32 BLE stack

#include <Wire.h>
#include <ICM_20948.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---- BLE UUIDs ----
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ---- BLE globals ----
BLEServer*         pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool bleClientConnected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s)    override { bleClientConnected = true;  Serial.println("BLE client connected");    }
  void onDisconnect(BLEServer* s) override { bleClientConnected = false; Serial.println("BLE client disconnected"); s->startAdvertising(); }
};

// ---- IMU ----
ICM_20948_I2C imu;

float roll  = 0.0;
float pitch = 0.0;
float yaw   = 0.0;
unsigned long lastTime = 0;
const float alpha = 0.98;

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("ESP32 ICM-20948 Game Controller");

  // ---- BLE init ----
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

  // ---- I2C + IMU init ----
  Serial.println("Initializing ICM-20948...");
  Wire.begin(21, 22);
  Wire.setClock(400000);

  bool initialized = false;
  while (!initialized) {
    imu.begin(Wire, 1);
    if (imu.status != ICM_20948_Stat_Ok) {
      Serial.print("ICM-20948 init failed: ");
      Serial.println(imu.statusString());
      Serial.println("Retrying in 500ms...");
      delay(500);
    } else {
      initialized = true;
    }
  }

  Serial.println("ICM-20948 ready!");
  Serial.println("Starting data transmission...\n");

  lastTime = millis();
}

void loop() {
  if (!imu.dataReady()) {
    delay(2);
    return;
  }

  imu.getAGMT();

  unsigned long currentTime = millis();
  float dt = (currentTime - lastTime) / 1000.0;
  lastTime = currentTime;

  float ax = imu.accX();
  float ay = imu.accY();
  float az = imu.accZ();

  float gx = imu.gyrX();
  float gy = imu.gyrY();
  float gz = imu.gyrZ();

  float accelRoll  = atan2(ay, az) * 180.0 / PI;
  float accelPitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;

  roll  = alpha * (roll  + gx * dt) + (1 - alpha) * accelRoll;
  pitch = alpha * (pitch + gy * dt) + (1 - alpha) * accelPitch;
  yaw   = yaw + gz * dt;

  if (yaw >  180) yaw -= 360;
  if (yaw < -180) yaw += 360;

  // Build JSON once, send to both transports
  char json[96];
  snprintf(json, sizeof(json),
    "{\"roll\":%.2f,\"yaw\":%.2f,\"pitch\":%.2f}",
    roll, yaw, pitch);

  Serial.println(json);

  if (bleClientConnected) {
    pCharacteristic->setValue(json);
    pCharacteristic->notify();
  }

  delay(20); // ~50 Hz
}
