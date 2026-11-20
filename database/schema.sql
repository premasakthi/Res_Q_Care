-- ============================================================================
-- ResQCare – Smart Elderly Emergency Care System
-- Database Schema (MySQL 8.0+)
-- ============================================================================

DROP DATABASE IF EXISTS resqcare_db;
CREATE DATABASE resqcare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE resqcare_db;

-- 1. USERS TABLE (Authentication & Role Base)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ROLE_PATIENT', 'ROLE_HOSPITAL_STAFF', 'ROLE_ADMIN') NOT NULL DEFAULT 'ROLE_PATIENT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
) ENGINE=InnoDB;

-- 2. HOSPITALS TABLE
CREATE TABLE hospitals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hospital_code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    emergency_hotline VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL DEFAULT 40.7128000,
    longitude DECIMAL(10, 7) NOT NULL DEFAULT -74.0060000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. PATIENTS TABLE
CREATE TABLE patients (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    patient_id VARCHAR(20) NOT NULL UNIQUE, -- e.g. RQ-1024
    full_name VARCHAR(100) NOT NULL,
    dob DATE NULL,
    age INT NOT NULL,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    registered_hospital_id BIGINT NULL,
    wristband_id VARCHAR(50) NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (registered_hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    INDEX idx_patient_code (patient_id),
    INDEX idx_patient_wristband (wristband_id)
) ENGINE=InnoDB;

-- 4. MEDICAL RECORDS TABLE
CREATE TABLE medical_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL UNIQUE,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    allergies TEXT NULL,
    medical_conditions TEXT NULL,
    major_surgeries TEXT NULL,
    critical_medications TEXT NULL,
    current_medications TEXT NULL,
    doctor_name VARCHAR(100) NULL,
    doctor_contact VARCHAR(30) NULL,
    additional_notes TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. EMERGENCY CONTACTS TABLE
CREATE TABLE emergency_contacts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    alt_phone_number VARCHAR(20) NULL,
    priority_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_contact_patient (patient_id)
) ENGINE=InnoDB;

-- 6. HOSPITAL STAFF TABLE
CREATE TABLE hospital_staff (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    hospital_id BIGINT NOT NULL,
    staff_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(80) NOT NULL DEFAULT 'Emergency Medicine',
    duty_role VARCHAR(50) NOT NULL DEFAULT 'Triage Physician',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. WRISTBANDS / IOT DEVICES TABLE
CREATE TABLE wristbands (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL UNIQUE, -- e.g. ESP32-RQ-882
    patient_id BIGINT NULL UNIQUE,
    mac_address VARCHAR(20) NULL,
    firmware_version VARCHAR(20) NOT NULL DEFAULT 'v1.4.2',
    battery_level INT NOT NULL DEFAULT 85,
    status ENUM('ONLINE', 'OFFLINE', 'CHARGING', 'ALERT') NOT NULL DEFAULT 'ONLINE',
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    INDEX idx_device_id (device_id)
) ENGINE=InnoDB;

-- 8. SENSOR DATA TABLE (Time-series vitals & telemetry)
CREATE TABLE sensor_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    wristband_id VARCHAR(50) NOT NULL,
    patient_id BIGINT NOT NULL,
    heart_rate INT NOT NULL,
    spo2 INT NOT NULL,
    activity_state ENUM('RESTING', 'WALKING', 'SLEEPING', 'FALL_DETECTED') NOT NULL DEFAULT 'RESTING',
    fall_detected BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_sensor_patient_time (patient_id, recorded_at)
) ENGINE=InnoDB;

-- 9. EMERGENCY EVENTS TABLE
CREATE TABLE emergency_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    hospital_id BIGINT NULL,
    event_type ENUM('FALL_DETECTED', 'ABNORMAL_VITALS', 'SOS_BUTTON') NOT NULL,
    heart_rate INT NULL,
    spo2 INT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    status ENUM('ACTIVE', 'ACCEPTED', 'DISPATCHED', 'RESOLVED') NOT NULL DEFAULT 'ACTIVE',
    accepted_by_staff_id BIGINT NULL,
    dispatched_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    response_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    FOREIGN KEY (accepted_by_staff_id) REFERENCES hospital_staff(id) ON DELETE SET NULL,
    INDEX idx_emergency_status (status),
    INDEX idx_emergency_created (created_at)
) ENGINE=InnoDB;

-- 10. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    emergency_event_id BIGINT NOT NULL,
    recipient_type ENUM('HOSPITAL', 'FAMILY_MEMBER') NOT NULL,
    recipient_target VARCHAR(120) NOT NULL, -- phone number or hospital desk code
    channel ENUM('DASHBOARD', 'SMS', 'EMAIL', 'PUSH') NOT NULL DEFAULT 'DASHBOARD',
    message TEXT NOT NULL,
    status ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'SENT',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emergency_event_id) REFERENCES emergency_events(id) ON DELETE CASCADE,
    INDEX idx_notif_event (emergency_event_id)
) ENGINE=InnoDB;

-- ============================================================================
-- SEED DATA (For Immediate Testing & Demo Readiness)
-- ============================================================================

-- Seed Hospitals
INSERT INTO hospitals (id, hospital_code, name, address, phone_number, emergency_hotline, latitude, longitude) VALUES
(1, 'HOSP-METRO-01', 'Metropolitan Emergency Hospital & Trauma Center', '742 Evergreen Blvd, New York, NY 10001', '+1 (555) 234-5670', '+1 (555) 911-0001', 40.748817, -73.985428),
(2, 'HOSP-STJUDE-02', 'St. Jude Geriatric & Cardiac Center', '105 Healthway Ave, Brooklyn, NY 11201', '+1 (555) 456-7890', '+1 (555) 911-0002', 40.692340, -73.987150);

-- Seed Hospital Staff User
INSERT INTO users (id, email, password_hash, role) VALUES
(1, 'er.staff@metrohospital.org', '$2a$12$e8Z4NkW0/YmF3p1BqV2cXe9JvK6pY9L5L5u5O9c3o4m3u7k1d3e8', 'ROLE_HOSPITAL_STAFF'),
(2, 'eleanor.vance@resqcare.io', '$2a$12$e8Z4NkW0/YmF3p1BqV2cXe9JvK6pY9L5L5u5O9c3o4m3u7k1d3e8', 'ROLE_PATIENT');

INSERT INTO hospital_staff (id, user_id, hospital_id, staff_code, full_name, department, duty_role) VALUES
(1, 1, 1, 'STF-ER-409', 'Dr. Alistair Sterling, MD', 'Emergency Medicine & Triage', 'Chief Triage Physician');

-- Seed Patient
INSERT INTO patients (id, user_id, patient_id, full_name, dob, age, gender, mobile_number, registered_hospital_id, wristband_id) VALUES
(1, 2, 'RQ-1024', 'Eleanor Vance', '1948-06-14', 78, 'FEMALE', '+1 (555) 839-2041', 1, 'ESP32-RQ-882');

-- Seed Medical Record for Eleanor Vance
INSERT INTO medical_records (id, patient_id, blood_group, allergies, medical_conditions, major_surgeries, critical_medications, current_medications, doctor_name, doctor_contact, additional_notes) VALUES
(1, 1, 'O+', 'Penicillin, Aspirin, Shellfish', 'Hypertension, Mild Congestive Heart Failure, Osteoporosis', 'Coronary Artery Bypass Graft (2018), Hip Replacement (2021)', 'Nitroglycerin sublingual PRN, Warfarin 5mg daily', 'Lisinopril 10mg, Metoprolol 25mg, Calcium + Vitamin D', 'Dr. Sarah Jenkins', '+1 (555) 902-3341', 'Patient has history of postural hypotension upon standing. Fall risk alert.');

-- Seed Emergency Contacts
INSERT INTO emergency_contacts (id, patient_id, contact_name, relationship, phone_number, alt_phone_number, priority_order) VALUES
(1, 1, 'David Vance', 'Son', '+1 (555) 492-1084', '+1 (555) 492-1085', 1),
(2, 1, 'Clara Vance-Hayes', 'Daughter', '+1 (555) 773-9201', NULL, 2);

-- Seed Wristband
INSERT INTO wristbands (id, device_id, patient_id, mac_address, firmware_version, battery_level, status) VALUES
(1, 'ESP32-RQ-882', 1, '34:85:18:A2:7B:44', 'v1.4.2', 88, 'ONLINE');

-- Seed Recent Sensor Data
INSERT INTO sensor_data (wristband_id, patient_id, heart_rate, spo2, activity_state, fall_detected, latitude, longitude) VALUES
('ESP32-RQ-882', 1, 74, 98, 'RESTING', FALSE, 40.751240, -73.983240),
('ESP32-RQ-882', 1, 76, 97, 'WALKING', FALSE, 40.751410, -73.983110),
('ESP32-RQ-882', 1, 72, 98, 'RESTING', FALSE, 40.751300, -73.983180);
