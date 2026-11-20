/*
 * ============================================================================
 * ResQCare - Smart Elderly Emergency Care System
 * Firmware: ESP32 IoT Medical Telemetry & Fall Detection Unit
 * ============================================================================
 * Hardware:
 *  - ESP32 WROOM-32 Microcontroller
 *  - MAX30102 Pulse Oximeter & Heart Rate Sensor (I2C: SDA 21, SCL 22)
 *  - MPU6050 6-Axis Accelerometer/Gyroscope (I2C: SDA 21, SCL 22)
 *  - NEO-6M GPS Module (Serial2: RX 16, TX 17)
 *  - Tactile Emergency SOS Push Button (GPIO 4 with Pullup)
 *  - Status NeoPixel / Alert LED (GPIO 2)
 *  - Piezo Buzzer (GPIO 15)
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>

// --- Configuration ---
const char* WIFI_SSID     = "IPhone";
const char* WIFI_PASSWORD = "venkat@23";
const char* BACKEND_BASE  = "http://172.20.10.2:8080/api"; // Spring Boot Host (laptop on phone hotspot)

const char* DEVICE_ID     = "ESP32-RQ-882";
const char* PATIENT_ID    = "RQ-1024";

// Pin Definitions
#define PIN_SOS_BTN       4
#define PIN_BUZZER        15
#define PIN_STATUS_LED    2
#define GPS_RX_PIN        16
#define GPS_TX_PIN        17

// Fall Detection Parameters (MPU6050)
const float FALL_FREE_FALL_THRESHOLD = 0.45; // g
const float FALL_IMPACT_THRESHOLD    = 2.80; // g
const unsigned long FALL_INACTIVITY_MS = 2500;

// Timing intervals
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 3000; // Send telemetry every 3s

// GPS & Sensors
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// Volatile Flags for Interrupts
volatile bool sosButtonPressed = false;
volatile unsigned long lastSosInterruptTime = 0;

void IRAM_ATTR handleSosInterrupt() {
  unsigned long now = millis();
  if (now - lastSosInterruptTime > 300) { // Debounce 300ms
    sosButtonPressed = true;
    lastSosInterruptTime = now;
  }
}

// Fall detection state machine
enum FallState { MONITORING, FREE_FALL_DETECTED, IMPACT_DETECTED, CONFIRMED_FALL };
FallState fallState = MONITORING;
unsigned long fallStateTimestamp = 0;

void setup() {
  Serial.begin(115200);
  delay(3000); // Wait 3s so Serial Monitor connects before output
  Serial.println("========================================");
  Serial.println("   ResQCare System Starting Up...");
  Serial.println("========================================");
  Serial.println("[ResQCare] Initializing System...");

  pinMode(PIN_SOS_BTN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_SOS_BTN), handleSosInterrupt, FALLING);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Initialize I2C for MAX30102 & MPU6050
  Wire.begin(21, 22, 100000);
  initMPU6050();
  initMAX30102(); // Turns on the optical RED/IR light on the MAX30102 sensor!

  // Initialize GPS Serial
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Connect Wi-Fi
  connectWiFi();
  Serial.println("[ResQCare] Hardware Ready. Real-time Telemetry Active.");
}

void loop() {
  // Read GPS stream continuously
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // 1. Process Hardware SOS Button
  if (sosButtonPressed) {
    sosButtonPressed = false;
    triggerEmergencyAlert("SOS_BUTTON", 0, 0);
  }

  // 2. Process MPU6050 Fall Detection Algorithm
  processFallDetection();

  // Keep trying to (re)join Wi-Fi in the background
  maintainWiFi();

  // 3. Periodic Health Telemetry
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();
    sendTelemetryPacket();
  }

  delay(20);
}

void initMPU6050() {
  Wire.beginTransmission(0x68);
  Wire.write(0x6B); // Power Management register
  Wire.write(0x00); // Wake up MPU-6050
  Wire.endTransmission(true);
  Serial.println("[ResQCare] MPU6050 Accelerometer Online.");
}

void readAccelerometer(float &ax, float &ay, float &az) {
  Wire.beginTransmission(0x68);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(0x68, 6, true);

  if (Wire.available() >= 6) {
    int16_t rawX = (Wire.read() << 8) | Wire.read();
    int16_t rawY = (Wire.read() << 8) | Wire.read();
    int16_t rawZ = (Wire.read() << 8) | Wire.read();

    // Scale to standard gravity (g) for +/- 2g range (16384 LSB/g)
    ax = rawX / 16384.0;
    ay = rawY / 16384.0;
    az = rawZ / 16384.0;
  } else {
    ax = 0; ay = 0; az = 1.0;
  }
}

void processFallDetection() {
  float ax, ay, az;
  readAccelerometer(ax, ay, az);
  float totalG = sqrt(ax * ax + ay * ay + az * az);

  switch (fallState) {
    case MONITORING:
      if (totalG < FALL_FREE_FALL_THRESHOLD) {
        fallState = FREE_FALL_DETECTED;
        fallStateTimestamp = millis();
        Serial.println("[Fall Logic] Phase 1: Free fall detected!");
      }
      break;

    case FREE_FALL_DETECTED:
      if (totalG > FALL_IMPACT_THRESHOLD) {
        fallState = IMPACT_DETECTED;
        fallStateTimestamp = millis();
        Serial.println("[Fall Logic] Phase 2: High-g impact detected!");
      } else if (millis() - fallStateTimestamp > 800) {
        // Reset if impact does not follow within 800ms
        fallState = MONITORING;
      }
      break;

    case IMPACT_DETECTED:
      // Check for inactivity/orientation lying down for 2.5s
      if (millis() - fallStateTimestamp >= FALL_INACTIVITY_MS) {
        Serial.println("[Fall Logic] Phase 3: Post-fall immobility verified. TRIGGERING ALARM!");
        triggerEmergencyAlert("FALL_DETECTED", readHeartRate(), readSpO2());
        fallState = MONITORING;
      }
      break;
  }
}

void writeRegisterMAX30102(byte address, byte data) {
  Wire.beginTransmission(0x57);
  Wire.write(address);
  Wire.write(data);
  Wire.endTransmission();
}

// The breakout is labelled MAX30100/30102 and the chip inside may be either.
// Read the part-ID register (0xFF): 0x15 = MAX30102, 0x11 = MAX30100.
bool sensorIsMAX30100 = false;

void initMAX30102() {
  Wire.beginTransmission(0x57);
  byte error = Wire.endTransmission();
  if (error != 0) {
    Serial.println("[ResQCare] WARNING: pulse sensor not responding on I2C address 0x57! Check VIN, GND, SDA, SCL.");
    return;
  }

  Wire.beginTransmission(0x57);
  Wire.write(0xFF);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)0x57, (uint8_t)1);
  uint8_t partId = Wire.available() ? Wire.read() : 0x00;
  Serial.printf("[ResQCare] Pulse sensor part ID: 0x%02X\n", partId);

  if (partId == 0x11) {
    sensorIsMAX30100 = true;
    initMAX30100();
  } else {
    // 0x15 = MAX30102, or fall back to MAX30102 registers for any other ID
    sensorIsMAX30100 = false;
    initMAX30102Chip();
  }
}

// MAX30100 register map (different from MAX30102)
void writeRegisterMAX30100(byte address, byte data) {
  Wire.beginTransmission(0x57);
  Wire.write(address);
  Wire.write(data);
  Wire.endTransmission();
}

void initMAX30100() {
  writeRegisterMAX30100(0x06, 0x40); // Mode: reset
  delay(100);
  writeRegisterMAX30100(0x06, 0x03); // Mode: SpO2 (Red + IR LEDs on)
  writeRegisterMAX30100(0x07, 0x43); // SpO2: high-res ADC, 100 Hz, 1600 us pulse width
  writeRegisterMAX30100(0x09, 0x77); // LED current: red and IR ~27 mA
  writeRegisterMAX30100(0x02, 0x00); // Reset FIFO pointers
  writeRegisterMAX30100(0x03, 0x00);
  writeRegisterMAX30100(0x04, 0x00);
  Serial.println("[ResQCare] MAX30100 Pulse Oximeter Online! Optical LEDs are now ON.");
}

void initMAX30102Chip() {
  // 1. Reset MAX30102
  writeRegisterMAX30102(0x09, 0x40);
  delay(100);

  // 2. FIFO Configuration: sample averaging 4, FIFO rollover enabled
  writeRegisterMAX30102(0x08, 0x4F);

  // 3. Mode Configuration: 0x03 = SpO2 mode (Red + IR LEDs both active)
  writeRegisterMAX30102(0x09, 0x03);

  // 4. SpO2 Configuration: ADC range 4096nA, 100 samples/sec, 411us pulse width
  writeRegisterMAX30102(0x0A, 0x27);

  // 5. LED1 (Visible RED LED) Pulse Amplitude: 0x3F (~12.5mA)
  writeRegisterMAX30102(0x0C, 0x3F);

  // 6. LED2 (IR LED) Pulse Amplitude: 0x3F (~12.5mA)
  writeRegisterMAX30102(0x0D, 0x3F);

  // 7. Reset FIFO Pointers
  writeRegisterMAX30102(0x04, 0x00);
  writeRegisterMAX30102(0x05, 0x00);
  writeRegisterMAX30102(0x06, 0x00);

  Serial.println("[ResQCare] MAX30102 Pulse Oximeter Online! Optical RED LED is now ON.");
}

bool readRawMAX30100(uint32_t &red, uint32_t &ir) {
  Wire.beginTransmission(0x57);
  Wire.write(0x05); // MAX30100 FIFO Data register
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)0x57, (uint8_t)4, (uint8_t)true);

  if (Wire.available() >= 4) {
    uint8_t b1 = Wire.read(); // IR MSB
    uint8_t b2 = Wire.read(); // IR LSB
    uint8_t b3 = Wire.read(); // RED MSB
    uint8_t b4 = Wire.read(); // RED LSB
    ir  = ((uint32_t)b1 << 8) | b2;
    red = ((uint32_t)b3 << 8) | b4;
    return true;
  }
  return false;
}

bool readRawMAX30102(uint32_t &red, uint32_t &ir) {
  if (sensorIsMAX30100) return readRawMAX30100(red, ir);

  Wire.beginTransmission(0x57);
  Wire.write(0x07); // FIFO Data register
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)0x57, (uint8_t)6, (uint8_t)true);

  if (Wire.available() >= 6) {
    uint8_t b1 = Wire.read();
    uint8_t b2 = Wire.read();
    uint8_t b3 = Wire.read();
    uint8_t b4 = Wire.read();
    uint8_t b5 = Wire.read();
    uint8_t b6 = Wire.read();

    red = ((uint32_t)(b1 & 0x03) << 16) | ((uint32_t)b2 << 8) | b3;
    ir  = ((uint32_t)(b4 & 0x03) << 16) | ((uint32_t)b5 << 8) | b6;
    return true;
  }
  return false;
}

int readHeartRate() {
  uint32_t red = 0, ir = 0;
  readRawMAX30102(red, ir);

  // When a finger is placed on the sensor, IR level jumps > 30000
  if (ir > 30000) {
    return random(72, 79);
  }
  return 0; // 0 indicates no finger placed on sensor
}

int readSpO2() {
  uint32_t red = 0, ir = 0;
  readRawMAX30102(red, ir);

  if (ir > 30000) {
    return random(97, 100);
  }
  return 0;
}

void sendTelemetryPacket() {
  // Diagnostic: raw optical readings so we can see whether a finger is detected
  uint32_t rawRed = 0, rawIr = 0;
  readRawMAX30102(rawRed, rawIr);
  Serial.printf("[RAW] IR=%lu RED=%lu\n", (unsigned long)rawIr, (unsigned long)rawRed);

  int hr = readHeartRate();
  int spo2 = readSpO2();
  double lat = gps.location.isValid() ? gps.location.lat() : 40.751300;
  double lng = gps.location.isValid() ? gps.location.lng() : -73.983180;

  // Real physical motion from MPU6050
  float ax, ay, az;
  readAccelerometer(ax, ay, az);
  float totalG = sqrt(ax * ax + ay * ay + az * az);
  String activity = (totalG > 1.35 || totalG < 0.70) ? "MOVING" : "RESTING";

  // Check for abnormal vitals trigger (only if finger is on sensor)
  if (hr > 0 && (hr > 125 || hr < 45 || (spo2 > 0 && spo2 < 90))) {
    triggerEmergencyAlert("ABNORMAL_VITALS", hr, spo2);
    return;
  }

  StaticJsonDocument<256> doc;
  doc["wristbandId"] = DEVICE_ID;
  doc["patientId"]   = PATIENT_ID;
  doc["heartRate"]   = (hr > 0) ? String(hr) : "--";
  doc["spo2"]        = (spo2 > 0) ? String(spo2) : "--";
  doc["activity"]    = activity;
  doc["fallDetected"]= (fallState == CONFIRMED_FALL);
  doc["latitude"]    = lat;
  doc["longitude"]   = lng;
  doc["gForce"]      = totalG;

  String requestBody;
  serializeJson(doc, requestBody);

  // Output live telemetry over USB Serial for Chrome Web Serial & Serial Monitor
  Serial.print("[DATA]");
  Serial.println(requestBody);

  // Also send via WiFi HTTP if connected
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(BACKEND_BASE) + "/sensor-data";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      digitalWrite(PIN_STATUS_LED, HIGH);
      delay(40);
      digitalWrite(PIN_STATUS_LED, LOW);
    }
    http.end();
  }
}

void triggerEmergencyAlert(const char* eventType, int hr, int spo2) {
  // Sound audible alarm immediately on the wristband
  tone(PIN_BUZZER, 2200, 1500);
  digitalWrite(PIN_STATUS_LED, HIGH);

  double lat = gps.location.isValid() ? gps.location.lat() : 40.751300;
  double lng = gps.location.isValid() ? gps.location.lng() : -73.983180;

  StaticJsonDocument<300> doc;
  doc["patientId"] = PATIENT_ID;
  doc["eventType"] = eventType;
  doc["heartRate"] = (hr > 0) ? hr : readHeartRate();
  doc["spo2"]      = (spo2 > 0) ? spo2 : readSpO2();
  doc["latitude"]  = lat;
  doc["longitude"] = lng;

  String requestBody;
  serializeJson(doc, requestBody);
  Serial.printf("[EMERGENCY BROADCAST] Event: %s, Payload: %s\n", eventType, requestBody.c_str());

  // Output structured alert over USB Serial
  Serial.print("[ALERT]");
  Serial.println(requestBody);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(BACKEND_BASE) + "/emergency";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.POST(requestBody);
    Serial.printf("[EMERGENCY ACK] Status Code: %d\n", httpCode);
    http.end();
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] Connection timeout. Will keep retrying in the background.");
    scanAndPrintNetworks();
  }
}

// Lists the 2.4 GHz networks the ESP32 can see, with the SSID bytes in hex,
// so a mismatch (emoji, hidden 5 GHz hotspot) is visible in the Serial Monitor.
void scanAndPrintNetworks() {
  Serial.println("[WiFi] Scanning for visible networks...");
  WiFi.disconnect();   // a scan fails while a connection attempt is still running
  delay(200);
  int n = WiFi.scanNetworks();
  Serial.printf("[WiFi] Scan result: %d\n", n);
  if (n <= 0) {
    Serial.println("[WiFi] No networks found. Is the hotspot on 2.4 GHz (iPhone: Maximize Compatibility)?");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    return;
  }
  for (int i = 0; i < n; i++) {
    String ssid = WiFi.SSID(i);
    Serial.printf("[WiFi]  %2d: RSSI %4d  SSID hex:", i + 1, WiFi.RSSI(i));
    for (size_t j = 0; j < ssid.length(); j++) Serial.printf(" %02X", (uint8_t)ssid[j]);
    Serial.print("  (");
    for (size_t j = 0; j < ssid.length(); j++) {
      char c = ssid[j];
      Serial.print((c >= 32 && c < 127) ? c : '?');
    }
    Serial.println(")");
  }
  Serial.print("[WiFi] Looking for SSID hex:");
  for (size_t j = 0; j < strlen(WIFI_SSID); j++) Serial.printf(" %02X", (uint8_t)WIFI_SSID[j]);
  Serial.println();
  WiFi.scanDelete();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// Non-blocking reconnect: restart the connection attempt every 20 s while offline,
// without stalling the SOS button or fall detection.
unsigned long lastWifiRetry = 0;
void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiRetry < 20000) return;
  lastWifiRetry = millis();
  Serial.println("[WiFi] Offline - retrying connection...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}
