# ResQCare – Smart Elderly Emergency Care System

> **Tagline:** *"Faster Medical Support When It Matters Most"*

ResQCare is a comprehensive IoT-driven emergency healthcare platform for the elderly. It bridges wearable sensors (ESP32, MAX30102, MPU6050, NEO-6M GPS) with high-availability cloud infrastructure (Spring Boot, MySQL, Apache Spark & Scala) and dual real-time portals (Patient/Family Portal and Hospital Trauma Center Triage Command).

---

## 🏗️ System Architecture Flow

The project implements this complete 10-stage end-to-end architecture:

```
┌─────────────────┐      ┌─────────────┐      ┌─────────────────────────────┐
│ Wearable Device │ ───► │    ESP32    │ ───► │  Sensors: MAX30102, MPU6050 │
│  (Senior Band)  │      │  Controller │      │     SOS Button, NEO-6M GPS  │
└─────────────────┘      └─────────────┘      └─────────────────────────────┘
                                                             │
                                                             ▼
┌──────────────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│   MySQL 8.0 Database     │ ◄─── │ Spring Boot 3.2 │ ◄─── │  GSM (SIM808) /  │
│ (Users, Vitals, Triage)  │      │    REST API     │      │   Wi-Fi (ESP32)  │
└──────────────────────────┘      └─────────────────┘      └──────────────────┘
             │
             ▼
┌──────────────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  Apache Spark + Scala    │ ───► │ Health Risk &   │ ───► │ Client & Hospital│
│  (Streaming & Analytics) │      │ Anomaly Predict │      │    Dashboards    │
└──────────────────────────┘      └─────────────────┘      └──────────────────┘
                                                                     │
                                                                     ▼
                                                           ┌──────────────────┐
                                                           │    Emergency     │
                                                           │  Notifications   │
                                                           └──────────────────┘
                                                                     │
                                                                     ▼
                                                           [Hospital Dispatch & Feedback Loop]
```

---

## 📁 Repository Directory Structure

```text
d:\project\
├── index.html                    # Main web app with Client, Hospital & Spark Portals
├── qr-emergency.html             # Standalone public emergency card for QR scans
├── css/
│   └── style.css                 # Clean, modern healthcare design system (Vanilla CSS)
├── js/
│   ├── app.js                    # View router & cross-tab synchronization
│   ├── demo-simulator.js         # ESP32 hardware & fall/SOS simulation engine
│   ├── client-portal.js          # Patient dashboard, medical profile, contacts, QR badge
│   ├── hospital-portal.js        # ER command center, alert banner, Leaflet GPS mapping
│   ├── qr-generator.js           # Embedded zero-dependency QR Code generator
│   └── audio-alerts.js           # Web Audio API emergency sirens and chimes
├── assets/
│   └── images/
│       ├── wristband-hero.jpg    # Custom photorealistic smart wristband render
│       └── hospital-team.jpg     # ER medical telemetry team render
├── database/
│   └── schema.sql                # Complete MySQL schema with 10 tables & seed data
├── backend/                      # Spring Boot 3 Java REST API
│   ├── pom.xml                   # Maven dependencies (Web, JPA, MySQL, WebSocket)
│   └── src/main/
│       ├── java/com/resqcare/
│       │   ├── ResQCareApplication.java
│       │   ├── controller/       # Auth, Patient, SensorData, Emergency, Hospital APIs
│       │   └── model/            # JPA entities (Patient, MedicalRecord, SensorData, etc.)
│       └── resources/
│           └── application.properties
├── analytics/                    # Apache Spark + Scala Analytics Engine
│   ├── build.sbt                 # Spark 3.5.1 dependencies
│   └── ResQCareAnalyticsJob.scala # Sliding-window vitals & fall anomaly detection
├── hardware/
│   └── esp32_resqcare.ino        # Production ESP32 Arduino C++ firmware sketch
└── README.md                     # System documentation & execution instructions
```

---

## 🚀 Running the Web Application Locally

The frontend is completely self-contained with an interactive **Demo Mode** hardware simulator.

### Method 1: Using Python Web Server (Recommended)
You can launch a local HTTP server using Windows PowerShell or WSL:

```powershell
# In PowerShell:
wsl -d Ubuntu -- python3 -m http.server 8080 --directory /mnt/d/project
```
Then open your browser at:
👉 **`http://localhost:8080`** (or open `d:\project\index.html` directly in any web browser).

---

## 🧪 Testing the Complete Emergency Flow (Demo Mode)

A floating **ESP32 Hardware Simulator** widget is available across all pages (Home, Client Portal, Hospital Portal, Spark Analytics, and QR Emergency Card):
- **Closable & Minimizable:** Click **`✕`** to fully close the simulator whenever you need an unobstructed view of dashboards and maps, or **`−`** to collapse it into a compact status bar.
- **Easy Reopening:** Reopen anytime with one click using the floating **`📟 Hardware Simulator`** launcher pill at the bottom-right, the **`📟 Simulator`** button in the top navigation bar, or by pressing **`Escape`** to dismiss.
- **Persistent State:** Drawer visibility preferences are remembered in `localStorage` across page navigation and refreshes.

1. **Simulate a Fall Incident:**
   - Click **`⚠️ Trigger Fall (MPU6050)`** on the simulator drawer or hero section.
   - The system immediately triggers the audible two-tone emergency alarm.
   - The **Hospital ER Command Portal** sounds the alarm and displays the crimson **CRITICAL EMERGENCY ALERT** banner with patient vitals and location.
   - The interactive **Leaflet GPS Map** plots the exact coordinates with a pulsing radar beacon.
2. **Hospital Response Workflow:**
   - Click **`📋 View Full Medical Dossier`** to review Eleanor Vance's blood type (O+), allergies, and medications.
   - Click **`✅ Accept Emergency`** $\rightarrow$ Logs acceptance by Dr. Sterling.
   - Click **`🚑 Dispatch Ambulance Unit`** $\rightarrow$ Simulates EMS ambulance dispatch with GPS routing.
   - Click **`✓ Mark Resolved`** $\rightarrow$ Silences the siren, resets status to Normal, and records the event in history.
3. **QR Medical ID Verification:**
   - Navigate to the **Client Portal** $\rightarrow$ **`🪪 QR Medical ID Badge`**.
   - Click **`↗ Open Standalone QR Page`** (or scan with a phone) to view the public first-responder card.

---

## 🗄️ Setting Up the MySQL Database

Import the complete database schema and seed data into MySQL:

```bash
mysql -u root -p < d:/project/database/schema.sql
```

The schema provisions 10 tables:
- `users` (Role-based access: Patient, Hospital Staff, Admin)
- `patients` (Demographics, wristband associations)
- `medical_records` (Blood group, allergies, medications, surgeries)
- `emergency_contacts` (Multiple family notification targets)
- `hospitals` & `hospital_staff` (Trauma center credentials and hotlines)
- `wristbands` (Device status, battery levels, MAC address)
- `sensor_data` (High-frequency telemetry: HR, SpO₂, acceleration)
- `emergency_events` (Full audit trail of active and resolved emergencies)
- `notifications` (Multi-channel dispatch logs)

---

## ☕ Running the Spring Boot 3 Backend

Requirements: Java 17+ and Maven 3.8+

```bash
cd d:/project/backend
mvn clean install
mvn spring-boot:run
```

The REST API exposes the following endpoints:
- `POST /api/auth/register` & `POST /api/auth/login`
- `GET /api/patients/{id}` & `GET /api/patients/{id}/medical`
- `POST /api/sensor-data` (Receives ESP32 telemetry packets)
- `POST /api/emergency` (Priority emergency broadcast)
- `GET /api/emergency/active` (Hospital emergency alert feed)
- `PUT /api/emergency/{id}/status` (Accept, Dispatch, Resolve)
- `GET /api/hospitals`

---

## ⚡ Running the Apache Spark + Scala Analytics Engine

Requirements: Scala 2.12 and SBT

```bash
cd d:/project/analytics
sbt run
```

The Spark job:
- Performs 5-minute sliding-window aggregations across telemetry records.
- Computes the **Cardiovascular Stability Index** and **Fall Propensity**.
- Identifies sustained tachycardia/hypoxia patterns and persists risk flags back to MySQL.

---

## 🔌 ESP32 Hardware Wiring & Flashing

Open `hardware/esp32_resqcare.ino` in the Arduino IDE:

### Pin Connections:
| Component | ESP32 Pin | Interface |
| :--- | :--- | :--- |
| **MAX30102** (Pulse Oximeter) | SDA $\rightarrow$ GPIO 21, SCL $\rightarrow$ GPIO 22 | I2C |
| **MPU6050** (Accelerometer) | SDA $\rightarrow$ GPIO 21, SCL $\rightarrow$ GPIO 22 | I2C |
| **NEO-6M GPS** | RX $\rightarrow$ GPIO 17, TX $\rightarrow$ GPIO 16 | Serial2 |
| **SOS Push Button** | GPIO 4 (Internal Pull-Up) | Digital Interrupt |
| **Piezo Buzzer** | GPIO 15 | PWM Output |
| **Status LED** | GPIO 2 | Digital Output |

Update the Wi-Fi credentials in `esp32_resqcare.ino`:
```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_BASE  = "http://YOUR_SERVER_IP:8080/api";
```
Upload with baud rate **115200**.
