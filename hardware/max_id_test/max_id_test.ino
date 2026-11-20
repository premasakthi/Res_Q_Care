// ResQCare diagnostic: identifies the pulse-sensor chip and checks the I2C bus.
// Upload this alone (separate from esp32_resqcare.ino), read the Serial Monitor at 115200 baud.
//
// Expected results:
//   MAX30102 -> part ID 0x15
//   MAX30100 -> part ID 0x11
//   Anything else / no ACK -> wiring, power, or wrong chip

#include <Wire.h>

const uint8_t MAX_ADDR = 0x57;
const uint8_t REG_PART_ID = 0xFF;

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println();
  Serial.println("[ID-TEST] ResQCare pulse sensor identification");

  Wire.begin(21, 22, 100000); // SDA = GPIO21, SCL = GPIO22

  // 1. Scan the bus
  Serial.println("[ID-TEST] Scanning I2C bus...");
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("  Device at 0x");
      if (addr < 16) Serial.print("0");
      Serial.println(addr, HEX);
      found++;
    }
  }
  if (found == 0) {
    Serial.println("  No I2C devices found. Check SDA/SCL wiring, GND, and power.");
  }

  // 2. Read the part-ID register on the pulse sensor
  Wire.beginTransmission(MAX_ADDR);
  Wire.write(REG_PART_ID);
  byte err = Wire.endTransmission(false);
  if (err != 0) {
    Serial.print("[ID-TEST] No ACK from 0x57 (error ");
    Serial.print(err);
    Serial.println("). Sensor is not responding on I2C.");
    return;
  }

  Wire.requestFrom(MAX_ADDR, (uint8_t)1);
  if (Wire.available()) {
    uint8_t id = Wire.read();
    Serial.print("[ID-TEST] Part ID register = 0x");
    if (id < 16) Serial.print("0");
    Serial.println(id, HEX);
    if (id == 0x15) {
      Serial.println("[ID-TEST] Chip is MAX30102. The sketch's register map is correct.");
    } else if (id == 0x11) {
      Serial.println("[ID-TEST] Chip is MAX30100. The MAX30102 init code will not light the LEDs.");
    } else {
      Serial.println("[ID-TEST] Unknown part ID. Check the chip marking.");
    }
  }
}

void loop() {
}
