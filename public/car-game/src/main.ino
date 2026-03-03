// ESP32 MPU6050 Game Controller for DXTR Therapy Game
// Sends roll, pitch, yaw data as JSON over Serial at 115200 baud

#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
#include <ArduinoJson.h>

Adafruit_MPU6050 mpu;

// Variables for complementary filter (combines accelerometer and gyroscope)
float roll = 0.0;
float pitch = 0.0;
float yaw = 0.0;
unsigned long lastTime = 0;
const float alpha = 0.98; // Complementary filter coefficient (0-1, higher = more gyro, lower = more accel)

void setup(void) {
  Serial.begin(115200);
  delay(100);

  Serial.println("ESP32 MPU6050 Game Controller");
  Serial.println("Initializing MPU6050...");

  // Initialize I2C with custom pins for ESP32 (SDA=21, SCL=22)
  Wire.begin(21, 22);
  
  // Try to initialize!
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip");
    while (1) {
      delay(10);
    }
  }
  Serial.println("MPU6050 Found!");

  // Configure sensor ranges
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_5_HZ);

  Serial.println("MPU6050 configured successfully!");
  Serial.println("Starting data transmission...");
  Serial.println(""); // Empty line to separate setup messages from data

  lastTime = millis();
}

void loop() {
  /* Get new sensor events with the readings */
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Calculate time delta for complementary filter
  unsigned long currentTime = millis();
  float dt = (currentTime - lastTime) / 1000.0; // Convert to seconds
  lastTime = currentTime;

  // Calculate roll and pitch from accelerometer (in degrees)
  float accelRoll = atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI;
  float accelPitch = atan2(-a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z)) * 180.0 / PI;

  // Convert gyro rates from rad/s to deg/s and integrate
  float gyroRollRate = g.gyro.x * 180.0 / PI;
  float gyroPitchRate = g.gyro.y * 180.0 / PI;
  float gyroYawRate = g.gyro.z * 180.0 / PI;

  // Complementary filter: combine accelerometer (low frequency) with gyroscope (high frequency)
  roll = alpha * (roll + gyroRollRate * dt) + (1 - alpha) * accelRoll;
  pitch = alpha * (pitch + gyroPitchRate * dt) + (1 - alpha) * accelPitch;
  yaw = yaw + gyroYawRate * dt; // Yaw requires magnetometer for absolute heading, using gyro only

  // Limit yaw to prevent overflow
  if (yaw > 180) yaw -= 360;
  if (yaw < -180) yaw += 360;

  // Output as JSON format expected by the game
  // Format: {"roll": value, "yaw": value, "pitch": value}
  Serial.print("{\"roll\":");
  Serial.print(roll, 2);
  Serial.print(",\"yaw\":");
  Serial.print(yaw, 2);
  Serial.print(",\"pitch\":");
  Serial.print(pitch, 2);
  Serial.println("}");

  // Send at ~50Hz (20ms delay)
  delay(20);
}
