package com.resqcare.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/hospitals")
public class HospitalController {

    private static final List<Map<String, Object>> hospitals = List.of(
        Map.of(
            "id", 1,
            "hospitalCode", "HOSP-METRO-01",
            "name", "Metropolitan Emergency Hospital & Trauma Center",
            "address", "742 Evergreen Blvd, New York, NY 10001",
            "phone", "+1 (555) 234-5670",
            "emergencyHotline", "+1 (555) 911-0001",
            "latitude", 40.748817,
            "longitude", -73.985428
        ),
        Map.of(
            "id", 2,
            "hospitalCode", "HOSP-STJUDE-02",
            "name", "St. Jude Geriatric & Cardiac Center",
            "address", "105 Healthway Ave, Brooklyn, NY 11201",
            "phone", "+1 (555) 456-7890",
            "emergencyHotline", "+1 (555) 911-0002",
            "latitude", 40.692340,
            "longitude", -73.987150
        )
    );

    @GetMapping
    public ResponseEntity<?> getAllHospitals() {
        return ResponseEntity.ok(hospitals);
    }

    @PostMapping
    public ResponseEntity<?> registerHospital(@RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(Map.of("status", "CREATED", "hospital", req));
    }

    @GetMapping("/{id}/patients")
    public ResponseEntity<?> getHospitalPatients(@PathVariable Long id) {
        return ResponseEntity.ok(List.of(
            Map.of("patientId", "RQ-1024", "fullName", "Eleanor Vance", "status", "MONITORED", "lastSync", "1 min ago")
        ));
    }
}
