package com.cledger.dto;

import com.cledger.entity.Session;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public class SessionResponse {

    private UUID id;
    private LocalDate date;
    private Set<String> types;
    private String intensity;
    private String performance;
    private String productivity;
    private Integer durationMinutes;
    private String notes;
    private String maxGrade;
    private Integer hardAttempts;
    private Set<String> painFlags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SessionResponse fromEntity(Session session) {
        SessionResponse response = new SessionResponse();
        response.id = session.getId();
        response.date = session.getDate();
        response.types = session.getTypes();
        response.intensity = session.getIntensity();
        response.performance = session.getPerformance();
        response.productivity = session.getProductivity();
        response.durationMinutes = session.getDurationMinutes();
        response.notes = session.getNotes();
        response.maxGrade = session.getMaxGrade();
        response.hardAttempts = session.getHardAttempts();
        response.painFlags = session.getPainFlags();
        response.createdAt = session.getCreatedAt();
        response.updatedAt = session.getUpdatedAt();
        return response;
    }

    public UUID getId() {
        return id;
    }

    public LocalDate getDate() {
        return date;
    }

    public Set<String> getTypes() {
        return types;
    }

    public String getIntensity() {
        return intensity;
    }

    public String getPerformance() {
        return performance;
    }

    public String getProductivity() {
        return productivity;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public String getNotes() {
        return notes;
    }

    public String getMaxGrade() {
        return maxGrade;
    }

    public Integer getHardAttempts() {
        return hardAttempts;
    }

    public Set<String> getPainFlags() {
        return painFlags;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
