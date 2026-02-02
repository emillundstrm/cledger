package com.cledger.dto;

import jakarta.validation.constraints.NotBlank;

public class InsightRequest {

    @NotBlank(message = "Content is required")
    private String content;

    private boolean pinned;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }
}
