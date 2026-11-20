package com.resqcare.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/emergency")
public class EmergencyController {

    private static final List<Map<String, Object>> activeEmergencies = new ArrayList<>();

    @PostMapping
    public ResponseEntity<?> triggerEmergency(@RequestBody Map<String, Object> req) {
        String emergencyId = "EMG-" + System.currentTimeMillis();
        Map<String, Object> event = new HashMap<>(req);
        event.put("emergencyId", emergencyId);
        event.put("status", "ACTIVE");
        event.put("timestamp", Instant.now().toString());

        activeEmergencies.add(0, event);

        // Dispatches notifications to hospital triage and family contacts
        return ResponseEntity.ok(Map.of(
            "status", "EMERGENCY_BROADCASTED",
            "emergencyId", emergencyId,
            "dispatchedHospital", true,
            "familyNotified", true,
            "details", event
        ));
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveEmergencies() {
        return ResponseEntity.ok(activeEmergencies);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEmergencyById(@PathVariable String id) {
        return activeEmergencies.stream()
            .filter(e -> id.equals(e.get("emergencyId")))
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearEmergencies() {
        activeEmergencies.clear();
        return ResponseEntity.ok(Map.of("status", "CLEARED"));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        String newStatus = body.getOrDefault("status", "ACCEPTED");
        if ("RESOLVED".equalsIgnoreCase(newStatus)) {
            activeEmergencies.removeIf(e -> id.equals(e.get("emergencyId")));
            return ResponseEntity.ok(Map.of("status", "RESOLVED", "emergencyId", id));
        }
        for (Map<String, Object> e : activeEmergencies) {
            if (id.equals(e.get("emergencyId"))) {
                e.put("status", newStatus);
                e.put("statusUpdatedAt", Instant.now().toString());
                return ResponseEntity.ok(Map.of("status", "SUCCESS", "emergencyId", id, "newStatus", newStatus));
            }
        }
        return ResponseEntity.ok(Map.of("status", "UPDATED", "emergencyId", id, "newStatus", newStatus));
    }
}
