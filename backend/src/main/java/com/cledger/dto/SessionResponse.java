package com.cledger.dto;

import com.cledger.entity.Session;
import com.cledger.entity.SessionInjury;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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
    private String venue;
    private List<InjuryResponse> injuries;
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
        response.venue = session.getVenue();
        response.injuries = session.getInjuries().stream()
            .map(InjuryResponse::fromEntity)
            .toList();
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

    public String getVenue() {
        return venue;
    }

    public List<InjuryResponse> getInjuries() {
        return injuries;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public static class InjuryResponse {

        private UUID id;
        private String location;
        private String note;

        public static InjuryResponse fromEntity(SessionInjury injury) {
            InjuryResponse response = new InjuryResponse();
            response.id = injury.getId();
            response.location = injury.getLocation();
            response.note = injury.getNote();
            return response;
        }

        public UUID getId() {
            return id;
        }

        public String getLocation() {
            return location;
        }

        public String getNote() {
            return note;
        }
    }
}
