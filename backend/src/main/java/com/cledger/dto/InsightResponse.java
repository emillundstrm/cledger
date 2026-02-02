package com.cledger.dto;

import com.cledger.entity.CoachInsight;

import java.time.LocalDateTime;
import java.util.UUID;

public class InsightResponse {

    private UUID id;
    private String content;
    private boolean pinned;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static InsightResponse fromEntity(CoachInsight insight) {
        InsightResponse response = new InsightResponse();
        response.id = insight.getId();
        response.content = insight.getContent();
        response.pinned = insight.isPinned();
        response.createdAt = insight.getCreatedAt();
        response.updatedAt = insight.getUpdatedAt();
        return response;
    }

    public UUID getId() {
        return id;
    }

    public String getContent() {
        return content;
    }

    public boolean isPinned() {
        return pinned;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
