package com.resqcare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", unique = true, nullable = false, length = 20)
    private String patientId; // e.g. RQ-1024

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    private Integer age;

    @Column(length = 20)
    private String gender;

    @Column(name = "mobile_number", length = 20)
    private String mobileNumber;

    @Column(name = "registered_hospital_id")
    private Long registeredHospitalId;

    @Column(name = "wristband_id", length = 50)
    private String wristbandId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToOne(mappedBy = "patient", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private MedicalRecord medicalRecord;
}
