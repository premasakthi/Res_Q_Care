package com.resqcare.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "hospital_id")
    private Long hospitalId;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType; // FALL_DETECTED, ABNORMAL_VITALS, SOS_BUTTON

    @Column(name = "heart_rate")
    private Integer heartRate;

    private Integer spo2;

    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal longitude;

    @Column(nullable = false, length = 30)
    private String status; // ACTIVE, ACCEPTED, DISPATCHED, RESOLVED

    @Column(name = "accepted_by_staff_id")
    private Long acceptedByStaffId;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "response_notes", columnDefinition = "TEXT")
    private String responseNotes;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
