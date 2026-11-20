package com.resqcare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_contacts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "contact_name", nullable = false, length = 100)
    private String contactName;

    @Column(nullable = false, length = 50)
    private String relationship;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "alt_phone_number", length = 20)
    private String altPhoneNumber;

    @Column(name = "priority_order")
    private Integer priorityOrder = 1;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
