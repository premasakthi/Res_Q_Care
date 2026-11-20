package com.resqcare.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    @GetMapping("/{id}")
    public ResponseEntity<?> getPatient(@PathVariable String id) {
        return ResponseEntity.ok(Map.of(
            "patientId", id,
            "fullName", "Eleanor Vance",
            "age", 78,
            "gender", "FEMALE",
            "mobileNumber", "+1 (555) 839-2041",
            "wristbandId", "ESP32-RQ-882",
            "registeredHospital", "Metropolitan Emergency Hospital"
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePatient(@PathVariable String id, @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(Map.of(
            "status", "UPDATED",
            "patientId", id,
            "data", req
        ));
    }

    @GetMapping("/{id}/medical")
    public ResponseEntity<?> getMedicalRecord(@PathVariable String id) {
        return ResponseEntity.ok(Map.of(
            "patientId", id,
            "bloodGroup", "O+",
            "allergies", "Penicillin, Aspirin, Shellfish",
            "medicalConditions", "Hypertension, Mild Congestive Heart Failure, Osteoporosis",
            "majorSurgeries", "Coronary Artery Bypass Graft (2018), Hip Replacement (2021)",
            "criticalMedications", "Nitroglycerin sublingual PRN, Warfarin 5mg daily",
            "currentMedications", "Lisinopril 10mg, Metoprolol 25mg, Calcium + Vitamin D",
            "doctorName", "Dr. Sarah Jenkins",
            "doctorContact", "+1 (555) 902-3341",
            "additionalNotes", "Postural hypotension. High fall risk."
        ));
    }

    @PutMapping("/{id}/medical")
    public ResponseEntity<?> updateMedicalRecord(@PathVariable String id, @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(Map.of(
            "status", "UPDATED",
            "patientId", id,
            "medicalRecord", req
        ));
    }

    @GetMapping("/{id}/contacts")
    public ResponseEntity<?> getEmergencyContacts(@PathVariable String id) {
        List<Map<String, String>> contacts = List.of(
            Map.of("id", "1", "name", "David Vance", "relation", "Son", "phone", "+1 (555) 492-1084", "altPhone", "+1 (555) 492-1085"),
            Map.of("id", "2", "name", "Clara Vance-Hayes", "relation", "Daughter", "phone", "+1 (555) 773-9201", "altPhone", "")
        );
        return ResponseEntity.ok(contacts);
    }

    @PostMapping("/{id}/contacts")
    public ResponseEntity<?> addContact(@PathVariable String id, @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(Map.of(
            "status", "CREATED",
            "patientId", id,
            "contact", req
        ));
    }
}
