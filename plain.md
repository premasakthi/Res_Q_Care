Create a complete, modern, responsive web application called **ResQCare – Smart Elderly Emergency Care System**.

The existing ResQCare concept is an elderly-care wristband that provides:
- QR-based instant access to a patient's essential medical information
- Heart-rate and SpO₂ monitoring
- Fall/activity detection
- Manual SOS emergency button
- GPS location tracking
- Automatic emergency alerts
- Hospital emergency response
- Family-member notifications

The application must have **two separate user portals** connected to the same backend and database:

# 1. CLIENT / PATIENT PORTAL

Create a clean, simple and senior-friendly interface.

## Client pages

### A. Landing Page
Include:
- ResQCare logo/name
- Tagline: "Faster Medical Support When It Matters Most"
- Short explanation of the wristband
- How It Works section
- Key features:
  - QR Medical ID
  - Fall Detection
  - Heart Rate & SpO₂ Monitoring
  - SOS Emergency Button
  - GPS Location
  - Hospital & Family Alerts
- "Register" button
- "Login" button
- Emergency-focused visual design

### B. Client Registration
Fields:
- Full Name
- Date of Birth / Age
- Gender
- Email
- Mobile Number
- Password
- Confirm Password

After registration, create a unique Patient ID.

### C. Medical Profile
Allow the client/authorized family member to add and edit:
- Patient Name
- Blood Group
- Allergies
- Medical Conditions
- Major Surgeries
- Important/Complicated Medicines
- Current Medications
- Doctor Name
- Doctor Contact
- Additional Medical Notes

Include:
- Save
- Edit
- Update
- View Profile

### D. Emergency Contacts
Allow the user to add:
- Family member name
- Relationship
- Phone number
- Alternate phone number

Allow adding multiple emergency contacts.

### E. Registered Hospital
Allow the client to select/register a hospital.

Display:
- Hospital name
- Hospital address
- Emergency contact
- Hospital phone number
- Registration status

### F. QR Medical ID
Generate/display a unique QR code associated with the Patient ID.

The QR code should open a secure medical-information page.

The QR page should display only the information appropriate for emergency access, such as:
- Patient name
- Blood group
- Allergies
- Major surgeries
- Critical medications
- Emergency contacts
- Relevant medical conditions

Do NOT store the entire medical record directly inside the QR code.

The QR should contain a secure patient ID or URL that retrieves information from the backend.

### G. Client Dashboard

Create a dashboard showing:

PATIENT STATUS
- Patient name
- Patient ID
- Wristband connection status
- Battery status
- Last synchronization time

HEALTH STATUS
- Heart rate
- SpO₂
- Current activity
- Fall detection status

EMERGENCY STATUS
- Normal / Warning / Emergency
- Last emergency event
- Emergency history

Include attractive cards and clear status indicators.

# 2. HOSPITAL PORTAL

Create a separate hospital login and dashboard.

## Hospital pages

### A. Hospital Login
Fields:
- Hospital ID
- Email
- Password

Only authorized hospital staff should access patient emergency information.

### B. Hospital Dashboard

Show:

- Total registered patients
- Active emergencies
- Patients currently being monitored
- Resolved emergencies
- Recent alerts

Create an emergency alert panel.

When an emergency occurs, display a prominent alert such as:

"EMERGENCY ALERT"

Patient ID: RQ1024
Patient Name: [Name]
Emergency Type: FALL DETECTED
Heart Rate: 128 BPM
SpO₂: 89%
Time: 10:42 AM

Include:
- View Patient
- View Medical Information
- View GPS Location
- Accept Emergency
- Dispatch/Respond
- Mark Resolved

### C. Emergency Patient Details

When hospital staff open an emergency, display:

PATIENT INFORMATION
- Name
- Age
- Blood group
- Allergies
- Medical conditions
- Major surgeries
- Important medications
- Emergency contacts

LIVE EMERGENCY DATA
- Heart rate
- SpO₂
- Activity
- Fall status
- GPS latitude
- GPS longitude
- Emergency timestamp

### D. GPS Location

Create a map section showing the patient's emergency location.

Display:
- Current latitude
- Current longitude
- Patient marker
- "Open in Maps" button

### E. Patient Search

Hospital staff should be able to search by:
- Patient ID
- Patient name
- Wristband/device ID

# 3. EMERGENCY WORKFLOW

Implement this complete workflow:

NORMAL CONDITION:

Wristband
→ ESP32
→ Sensors
→ Backend
→ Database
→ Client Dashboard

FALL DETECTION:

MPU6050
→ ESP32
→ Activity/Fall Detection
→ Backend API
→ Emergency Event
→ Hospital Dashboard
→ Family Notification

ABNORMAL VITALS:

MAX30102
→ ESP32
→ Heart Rate / SpO₂ analysis
→ Backend API
→ Emergency Event
→ Hospital Dashboard
→ Family Notification

MANUAL SOS:

SOS Button
→ ESP32
→ Emergency Event
→ GPS Location
→ Backend
→ Hospital Dashboard
→ Family Notification

# 4. BACKEND ARCHITECTURE

Use a proper REST API.

Recommended stack:

Frontend:
- HTML
- CSS
- JavaScript
- Tailwind CSS or Bootstrap
- Use React only if appropriate

Backend:
- Java
- Spring Boot
- REST APIs

Database:
- MySQL

Hardware:
- ESP32

Communication:
- Wi-Fi or GSM/4G

The architecture should be:

ESP32
↓
REST API
↓
Spring Boot Backend
↓
MySQL Database
↓
Client Portal + Hospital Portal

Create API endpoints for:

Authentication:
POST /api/auth/register
POST /api/auth/login

Patients:
POST /api/patients
GET /api/patients/{id}
PUT /api/patients/{id}

Medical records:
GET /api/patients/{id}/medical
PUT /api/patients/{id}/medical

Emergency contacts:
POST /api/patients/{id}/contacts
GET /api/patients/{id}/contacts
PUT /api/contacts/{id}
DELETE /api/contacts/{id}

Wristband:
GET /api/devices/{deviceId}
PUT /api/devices/{deviceId}

Sensor data:
POST /api/sensor-data
GET /api/sensor-data/{patientId}

Emergency:
POST /api/emergency
GET /api/emergency/active
GET /api/emergency/{id}
PUT /api/emergency/{id}/status

Hospitals:
POST /api/hospitals
GET /api/hospitals
GET /api/hospitals/{id}/patients

# 5. DATABASE

Create the following tables:

users
patients
medical_records
emergency_contacts
hospitals
hospital_staff
wristbands
sensor_data
emergency_events
notifications

Use proper primary keys and foreign keys.

Relationship:

User
→ Patient
→ Medical Record
→ Emergency Contacts
→ Wristband
→ Sensor Data
→ Emergency Events
→ Hospital

# 6. NOTIFICATION SYSTEM

When an emergency is detected:

1. Create emergency event.
2. Save the event in MySQL.
3. Notify the registered hospital.
4. Notify emergency contacts.
5. Include patient ID.
6. Include emergency type.
7. Include heart rate and SpO₂ if available.
8. Include GPS coordinates.
9. Include timestamp.
10. Provide a link to view the patient's emergency details.

For the prototype, notifications can initially be simulated inside the dashboards.

Later integrate:
- SMS
- Email
- Push notifications

# 7. SECURITY

Because medical information is sensitive:

- Implement authentication.
- Use role-based access.
- Client users can access only their own records.
- Hospital staff can access patients associated with their hospital/emergency event.
- Do not expose the complete medical database through the QR code.
- Use secure patient identifiers.
- Validate all API requests.
- Never store passwords as plain text.
- Use password hashing.
- Protect sensitive API endpoints.

# 8. UI/UX DESIGN

Design should look like a professional healthcare technology platform, not a generic student website.

Style:
- Clean
- Modern
- Trustworthy
- Minimal
- Medical/emergency focused
- Mobile responsive

Use:
- White/light background
- Deep blue/navy as the primary color
- Red only for emergency states
- Green for safe/normal states
- Amber/orange for warnings
- Rounded cards
- Clear typography
- Large buttons
- High contrast
- Accessible design

The client interface must be especially easy for elderly users and family members.

The hospital interface should prioritize emergency alerts and response speed.

# 9. RESPONSIVE DESIGN

The application must work properly on:
- Desktop
- Laptop
- Tablet
- Mobile

Do not allow horizontal scrolling.

# 10. DEMO MODE

Because the hardware may not initially be connected, create a Demo Mode.

Demo Mode should allow:
- Simulating normal heart rate
- Simulating low SpO₂
- Simulating fall detection
- Triggering SOS
- Simulating GPS coordinates
- Creating an emergency alert
- Showing the emergency immediately on the hospital dashboard

This will allow the complete software system to be demonstrated before connecting the physical wristband.

# 11. FINAL SYSTEM FLOW

The finished application should represent this architecture:

ELDERLY PERSON
↓
WEARABLE WRISTBAND
↓
ESP32
↓
MPU6050 + MAX30102 + SOS + GPS
↓
Wi-Fi / GSM
↓
SPRING BOOT REST API
↓
MYSQL DATABASE
↓
┌─────────────────────┬─────────────────────┐
│                     │                     │
CLIENT PORTAL     HOSPITAL PORTAL      NOTIFICATION
│                     │                     │
Medical Records       Emergency Alert      Family
QR Medical ID         Patient Details      Hospital
Health Dashboard      GPS Location         Alerts
Emergency Contacts    Response Status
└─────────────────────┴─────────────────────┘

IMPORTANT:
Do not create a completely unrelated healthcare website. Keep the project name **ResQCare** and preserve the existing QR/medical-ID concept.

The website should be structured so that the current ResQCare QR functionality can later be connected to the new patient database and backend rather than being discarded.

Build the project in a modular way so that the ESP32 hardware can later send real sensor data to the same backend API.

Provide the complete folder structure, database schema, frontend pages, backend API structure, authentication flow, and clear instructions for running the application locally and deploying it.