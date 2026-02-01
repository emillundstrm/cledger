package com.cledger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public class SessionRequest {

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotEmpty(message = "At least one session type is required")
    private Set<String> types;

    @NotBlank(message = "Intensity is required")
    private String intensity;

    @NotBlank(message = "Performance is required")
    private String performance;

    @NotBlank(message = "Productivity is required")
    private String productivity;

    private Integer durationMinutes;
    private String notes;
    private String maxGrade;
    private Integer hardAttempts;
    private String venue;
    private List<InjuryRequest> injuries;

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Set<String> getTypes() {
        return types;
    }

    public void setTypes(Set<String> types) {
        this.types = types;
    }

    public String getIntensity() {
        return intensity;
    }

    public void setIntensity(String intensity) {
        this.intensity = intensity;
    }

    public String getPerformance() {
        return performance;
    }

    public void setPerformance(String performance) {
        this.performance = performance;
    }

    public String getProductivity() {
        return productivity;
    }

    public void setProductivity(String productivity) {
        this.productivity = productivity;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getMaxGrade() {
        return maxGrade;
    }

    public void setMaxGrade(String maxGrade) {
        this.maxGrade = maxGrade;
    }

    public Integer getHardAttempts() {
        return hardAttempts;
    }

    public void setHardAttempts(Integer hardAttempts) {
        this.hardAttempts = hardAttempts;
    }

    public String getVenue() {
        return venue;
    }

    public void setVenue(String venue) {
        this.venue = venue;
    }

    public List<InjuryRequest> getInjuries() {
        return injuries;
    }

    public void setInjuries(List<InjuryRequest> injuries) {
        this.injuries = injuries;
    }

    public static class InjuryRequest {

        private String location;
        private String note;

        public InjuryRequest() {
        }

        public InjuryRequest(String location, String note) {
            this.location = location;
            this.note = note;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public String getNote() {
            return note;
        }

        public void setNote(String note) {
            this.note = note;
        }
    }
}
