package com.cledger.controller;

import com.cledger.dto.SessionRequest;
import com.cledger.dto.SessionResponse;
import com.cledger.service.SessionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.cledger.entity.SessionInjury;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SessionController.class)
class SessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionService sessionService;

    private ObjectMapper objectMapper;
    private SessionResponse sampleResponse;
    private UUID sampleId;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        sampleId = UUID.randomUUID();
        sampleResponse = createSampleResponse(sampleId);
    }

    @Test
    void getAllSessions_returnsListOfSessions() throws Exception {
        when(sessionService.getAllSessions()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/sessions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(sampleId.toString()))
            .andExpect(jsonPath("$[0].intensity").value("hard"))
            .andExpect(jsonPath("$[0].performance").value("strong"))
            .andExpect(jsonPath("$[0].productivity").value("high"));
    }

    @Test
    void getSession_returnsSessionWhenFound() throws Exception {
        when(sessionService.getSession(sampleId)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/sessions/{id}", sampleId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(sampleId.toString()))
            .andExpect(jsonPath("$.intensity").value("hard"));
    }

    @Test
    void getSession_returns404WhenNotFound() throws Exception {
        when(sessionService.getSession(sampleId))
            .thenThrow(new SessionService.SessionNotFoundException(sampleId));

        mockMvc.perform(get("/api/sessions/{id}", sampleId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void createSession_returns201OnSuccess() throws Exception {
        when(sessionService.createSession(any(SessionRequest.class))).thenReturn(sampleResponse);

        String body = objectMapper.writeValueAsString(createValidRequest());

        mockMvc.perform(post("/api/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(sampleId.toString()));
    }

    @Test
    void createSession_returns400WhenMissingRequiredFields() throws Exception {
        SessionRequest request = new SessionRequest();

        mockMvc.perform(post("/api/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createSession_returns400WhenInvalidValues() throws Exception {
        SessionRequest request = createValidRequest();
        request.setIntensity("extreme");

        when(sessionService.createSession(any(SessionRequest.class)))
            .thenThrow(new SessionService.InvalidSessionException("Invalid intensity: extreme"));

        mockMvc.perform(post("/api/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void updateSession_returns200OnSuccess() throws Exception {
        when(sessionService.updateSession(eq(sampleId), any(SessionRequest.class)))
            .thenReturn(sampleResponse);

        String body = objectMapper.writeValueAsString(createValidRequest());

        mockMvc.perform(put("/api/sessions/{id}", sampleId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(sampleId.toString()));
    }

    @Test
    void updateSession_returns404WhenNotFound() throws Exception {
        when(sessionService.updateSession(eq(sampleId), any(SessionRequest.class)))
            .thenThrow(new SessionService.SessionNotFoundException(sampleId));

        mockMvc.perform(put("/api/sessions/{id}", sampleId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createValidRequest())))
            .andExpect(status().isNotFound());
    }

    @Test
    void deleteSession_returns204OnSuccess() throws Exception {
        doNothing().when(sessionService).deleteSession(sampleId);

        mockMvc.perform(delete("/api/sessions/{id}", sampleId))
            .andExpect(status().isNoContent());
    }

    @Test
    void deleteSession_returns404WhenNotFound() throws Exception {
        doThrow(new SessionService.SessionNotFoundException(sampleId))
            .when(sessionService).deleteSession(sampleId);

        mockMvc.perform(delete("/api/sessions/{id}", sampleId))
            .andExpect(status().isNotFound());
    }

    private SessionRequest createValidRequest() {
        SessionRequest request = new SessionRequest();
        request.setDate(LocalDate.of(2026, 1, 15));
        request.setTypes(Set.of("boulder"));
        request.setIntensity("hard");
        request.setPerformance("strong");
        request.setProductivity("high");
        request.setDurationMinutes(90);
        request.setNotes("Good session");
        request.setMaxGrade("7A");
        request.setInjuries(List.of(
            new SessionRequest.InjuryRequest("finger", null)
        ));
        return request;
    }

    private SessionResponse createSampleResponse(UUID id) {
        // Use the fromEntity approach but we need a session entity
        // Since SessionResponse fields are package-private via fromEntity, let's use reflection-free approach
        com.cledger.entity.Session session = new com.cledger.entity.Session();
        session.setId(id);
        session.setDate(LocalDate.of(2026, 1, 15));
        session.setTypes(Set.of("boulder"));
        session.setIntensity("hard");
        session.setPerformance("strong");
        session.setProductivity("high");
        session.setDurationMinutes(90);
        session.setNotes("Good session");
        session.setMaxGrade("7A");
        SessionInjury injury = new SessionInjury("finger", null);
        injury.setSession(session);
        session.getInjuries().add(injury);
        return SessionResponse.fromEntity(session);
    }
}
