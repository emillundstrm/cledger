package com.cledger.controller;

import com.cledger.repository.SessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InjuryLocationController.class)
class InjuryLocationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionRepository sessionRepository;

    @Test
    void getInjuryLocations_returnsDistinctLocationsSorted() throws Exception {
        when(sessionRepository.findDistinctInjuryLocations())
            .thenReturn(List.of("elbow", "finger", "left knee", "shoulder"));

        mockMvc.perform(get("/api/injury-locations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0]").value("elbow"))
            .andExpect(jsonPath("$[1]").value("finger"))
            .andExpect(jsonPath("$[2]").value("left knee"))
            .andExpect(jsonPath("$[3]").value("shoulder"));
    }

    @Test
    void getInjuryLocations_returnsEmptyListWhenNoInjuries() throws Exception {
        when(sessionRepository.findDistinctInjuryLocations()).thenReturn(List.of());

        mockMvc.perform(get("/api/injury-locations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$").isEmpty());
    }
}
