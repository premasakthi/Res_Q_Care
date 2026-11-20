package com.resqcare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "patient_id", referencedColumnName = "id")
    private Patient patient;

    @Column(name = "blood_group", length = 10, nullable = false)
    private String bloodGroup;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "medical_conditions", columnDefinition = "TEXT")
    private String medicalConditions;

    @Column(name = "major_surgeries", columnDefinition = "TEXT")
    private String majorSurgeries;

    @Column(name = "critical_medications", columnDefinition = "TEXT")
    private String criticalMedications;

    @Column(name = "current_medications", columnDefinition = "TEXT")
    private String currentMedications;

    @Column(name = "doctor_name", length = 100)
    private String doctorName;

    @Column(name = "doctor_contact", length = 30)
    private String doctorContact;

    @Column(name = "additional_notes", columnDefinition = "TEXT")
    private String additionalNotes;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}
