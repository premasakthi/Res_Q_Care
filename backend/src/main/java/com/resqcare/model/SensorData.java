package com.resqcare.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_data")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SensorData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wristband_id", nullable = false, length = 50)
    private String wristbandId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "heart_rate", nullable = false)
    private Integer heartRate;

    @Column(nullable = false)
    private Integer spo2;

    @Column(name = "activity_state", length = 30)
    private String activityState;

    @Column(name = "fall_detected")
    private Boolean fallDetected = false;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt = LocalDateTime.now();
}
