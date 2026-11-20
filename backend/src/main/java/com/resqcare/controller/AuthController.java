package com.resqcare.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> req) {
        String email = (String) req.get("email");
        String fullName = (String) req.get("fullName");
        String patientId = "RQ-" + (1000 + (int)(Math.random() * 9000));

        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Patient registered successfully",
            "patientId", patientId,
            "fullName", fullName,
            "email", email,
            "token", "jwt_token_" + UUID.randomUUID()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> req) {
        String email = (String) req.get("email");
        String role = (String) req.getOrDefault("role", "ROLE_PATIENT");

        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Authentication successful",
            "email", email,
            "role", role,
            "token", "jwt_token_" + UUID.randomUUID()
        ));
    }
}
