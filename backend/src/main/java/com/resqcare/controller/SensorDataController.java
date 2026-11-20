package com.resqcare.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/sensor-data")
public class SensorDataController {

    private static final Map<String, Object> latestTelemetry = new ConcurrentHashMap<>();
    private static volatile long lastReceivedMillis = 0;

    @PostMapping
    public ResponseEntity<?> receiveSensorTelemetry(@RequestBody Map<String, Object> telemetry) {
        lastReceivedMillis = System.currentTimeMillis();
        telemetry.put("receivedAt", Instant.now().toString());
        latestTelemetry.clear();
        latestTelemetry.putAll(telemetry);
        return ResponseEntity.ok(Map.of(
            "status", "RECORDED",
            "receivedAt", telemetry.get("receivedAt"),
            "wristbandId", telemetry.getOrDefault("wristbandId", "UNKNOWN"),
            "heartRate", telemetry.getOrDefault("heartRate", "--"),
            "spo2", telemetry.getOrDefault("spo2", "--")
        ));
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatestTelemetryGlobal() {
        long age = System.currentTimeMillis() - lastReceivedMillis;
        // If no packet received within the last 5 seconds, hardware is OFFLINE
        if (lastReceivedMillis == 0 || age > 5000) {
            return ResponseEntity.ok(Map.of(
                "status", "DISCONNECTED",
                "wristbandId", "ESP32-RQ-882",
                "connected", false,
                "heartRate", "--",
                "spo2", "--",
                "activity", "OFFLINE",
                "ageMs", age
            ));
        }
        Map<String, Object> response = new HashMap<>(latestTelemetry);
        response.put("connected", true);
        response.put("status", "CONNECTED");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{patientId}")
    public ResponseEntity<?> getLatestTelemetry(@PathVariable String patientId) {
        return getLatestTelemetryGlobal();
    }
}
