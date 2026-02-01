package com.cledger.controller;

import com.cledger.dto.AnalyticsResponse;
import com.cledger.dto.AnalyticsResponse.PainFlagCount;
import com.cledger.dto.AnalyticsResponse.WeeklySessionCount;
import com.cledger.service.AnalyticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnalyticsController.class)
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalyticsService analyticsService;

    @Test
    void getAnalytics_returns200WithAnalyticsData() throws Exception {
        AnalyticsResponse response = new AnalyticsResponse();
        response.setSessionsThisWeek(3);
        response.setHardSessionsLast7Days(1);
        response.setDaysSinceLastRestDay(2);
        response.setPainFlagsLast30Days(List.of(
            new PainFlagCount("finger", 4)
        ));
        response.setWeeklySessionCounts(List.of(
            new WeeklySessionCount(LocalDate.of(2026, 1, 26), 3)
        ));

        when(analyticsService.getAnalytics()).thenReturn(response);

        mockMvc.perform(get("/api/analytics"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessionsThisWeek").value(3))
            .andExpect(jsonPath("$.hardSessionsLast7Days").value(1))
            .andExpect(jsonPath("$.daysSinceLastRestDay").value(2))
            .andExpect(jsonPath("$.painFlagsLast30Days[0].location").value("finger"))
            .andExpect(jsonPath("$.painFlagsLast30Days[0].count").value(4))
            .andExpect(jsonPath("$.weeklySessionCounts[0].weekStart").value("2026-01-26"))
            .andExpect(jsonPath("$.weeklySessionCounts[0].count").value(3));
    }

    @Test
    void getAnalytics_returnsEmptyAnalytics() throws Exception {
        AnalyticsResponse response = new AnalyticsResponse();
        response.setSessionsThisWeek(0);
        response.setHardSessionsLast7Days(0);
        response.setDaysSinceLastRestDay(0);
        response.setPainFlagsLast30Days(List.of());
        response.setWeeklySessionCounts(List.of());

        when(analyticsService.getAnalytics()).thenReturn(response);

        mockMvc.perform(get("/api/analytics"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessionsThisWeek").value(0))
            .andExpect(jsonPath("$.painFlagsLast30Days").isEmpty())
            .andExpect(jsonPath("$.weeklySessionCounts").isEmpty());
    }
}
