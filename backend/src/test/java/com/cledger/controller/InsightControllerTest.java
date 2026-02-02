package com.cledger.controller;

import com.cledger.dto.InsightResponse;
import com.cledger.service.InsightService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InsightController.class)
class InsightControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private InsightService insightService;

    private InsightResponse createSampleResponse(UUID id, String content, boolean pinned) {
        // Use reflection or create via the service pattern
        // Since InsightResponse has no public setters, we use fromEntity indirectly
        // For test simplicity, let's use the mock to return what we need
        InsightResponse response = mock(InsightResponse.class);
        when(response.getId()).thenReturn(id);
        when(response.getContent()).thenReturn(content);
        when(response.isPinned()).thenReturn(pinned);
        when(response.getCreatedAt()).thenReturn(LocalDateTime.of(2026, 2, 2, 10, 0));
        when(response.getUpdatedAt()).thenReturn(LocalDateTime.of(2026, 2, 2, 10, 0));
        return response;
    }

    @Test
    void getAllInsights_returnsListOfInsights() throws Exception {
        UUID id = UUID.randomUUID();
        InsightResponse response = createSampleResponse(id, "Rest more after hard sessions", true);
        when(insightService.getAllInsights()).thenReturn(List.of(response));

        mockMvc.perform(get("/api/insights"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(id.toString()))
            .andExpect(jsonPath("$[0].content").value("Rest more after hard sessions"))
            .andExpect(jsonPath("$[0].pinned").value(true));
    }

    @Test
    void getInsight_returnsInsight() throws Exception {
        UUID id = UUID.randomUUID();
        InsightResponse response = createSampleResponse(id, "Focus on finger strength", false);
        when(insightService.getInsight(id)).thenReturn(response);

        mockMvc.perform(get("/api/insights/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id.toString()))
            .andExpect(jsonPath("$.content").value("Focus on finger strength"));
    }

    @Test
    void getInsight_returns404WhenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        when(insightService.getInsight(id))
            .thenThrow(new InsightService.InsightNotFoundException(id));

        mockMvc.perform(get("/api/insights/{id}", id))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void createInsight_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        InsightResponse response = createSampleResponse(id, "New insight content", false);
        when(insightService.createInsight(any())).thenReturn(response);

        mockMvc.perform(post("/api/insights")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("content", "New insight content", "pinned", false))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(id.toString()))
            .andExpect(jsonPath("$.content").value("New insight content"));
    }

    @Test
    void createInsight_returns400WhenContentBlank() throws Exception {
        mockMvc.perform(post("/api/insights")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("content", "", "pinned", false))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void updateInsight_returnsUpdated() throws Exception {
        UUID id = UUID.randomUUID();
        InsightResponse response = createSampleResponse(id, "Updated content", true);
        when(insightService.updateInsight(eq(id), any())).thenReturn(response);

        mockMvc.perform(put("/api/insights/{id}", id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("content", "Updated content", "pinned", true))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").value("Updated content"))
            .andExpect(jsonPath("$.pinned").value(true));
    }

    @Test
    void deleteInsight_returns204() throws Exception {
        UUID id = UUID.randomUUID();
        doNothing().when(insightService).deleteInsight(id);

        mockMvc.perform(delete("/api/insights/{id}", id))
            .andExpect(status().isNoContent());
    }

    @Test
    void deleteInsight_returns404WhenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        doThrow(new InsightService.InsightNotFoundException(id))
            .when(insightService).deleteInsight(id);

        mockMvc.perform(delete("/api/insights/{id}", id))
            .andExpect(status().isNotFound());
    }
}
