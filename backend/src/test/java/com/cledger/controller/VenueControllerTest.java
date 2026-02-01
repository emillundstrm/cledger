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

@WebMvcTest(VenueController.class)
class VenueControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionRepository sessionRepository;

    @Test
    void getVenues_returnsDistinctVenuesSorted() throws Exception {
        when(sessionRepository.findDistinctVenues())
            .thenReturn(List.of("Beta Bloc", "Climbing Factory", "The Depot"));

        mockMvc.perform(get("/api/venues"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0]").value("Beta Bloc"))
            .andExpect(jsonPath("$[1]").value("Climbing Factory"))
            .andExpect(jsonPath("$[2]").value("The Depot"));
    }

    @Test
    void getVenues_returnsEmptyListWhenNoVenues() throws Exception {
        when(sessionRepository.findDistinctVenues()).thenReturn(List.of());

        mockMvc.perform(get("/api/venues"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$").isEmpty());
    }
}
