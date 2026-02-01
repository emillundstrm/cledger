package com.cledger.service;

import com.cledger.dto.AnalyticsResponse;
import com.cledger.dto.AnalyticsResponse.PainFlagCount;
import com.cledger.dto.AnalyticsResponse.WeeklySessionCount;
import com.cledger.repository.SessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private SessionRepository sessionRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    // Use a fixed "today" for deterministic tests: Wednesday 2026-01-28
    // ISO week starts Monday 2026-01-26
    private static final LocalDate TODAY = LocalDate.of(2026, 1, 28);
    private static final LocalDate WEEK_START = LocalDate.of(2026, 1, 26); // Monday

    @Test
    void sessionsThisWeek_countsSessionsInCurrentIsoWeek() {
        when(sessionRepository.countByDateBetween(WEEK_START, WEEK_START.plusDays(6)))
            .thenReturn(3L);
        when(sessionRepository.countByIntensityAndDateBetween(any(), any(), any())).thenReturn(0L);
        when(sessionRepository.findDistinctDatesByDateBetween(any(), any())).thenReturn(List.of());
        when(sessionRepository.countPainFlagsByDateBetween(any(), any())).thenReturn(List.of());

        AnalyticsResponse result = analyticsService.getAnalytics(TODAY);

        assertEquals(3, result.getSessionsThisWeek());
    }

    @Test
    void hardSessionsLast7Days_countsHardIntensitySessions() {
        LocalDate sevenDaysAgo = TODAY.minusDays(6);
        when(sessionRepository.countByDateBetween(any(), any())).thenReturn(0L);
        when(sessionRepository.countByIntensityAndDateBetween("hard", sevenDaysAgo, TODAY))
            .thenReturn(2L);
        when(sessionRepository.findDistinctDatesByDateBetween(any(), any())).thenReturn(List.of());
        when(sessionRepository.countPainFlagsByDateBetween(any(), any())).thenReturn(List.of());

        AnalyticsResponse result = analyticsService.getAnalytics(TODAY);

        assertEquals(2, result.getHardSessionsLast7Days());
    }

    @Test
    void daysSinceLastRestDay_returnsZeroWhenTodayHasNoSession() {
        when(sessionRepository.countByDateBetween(any(), any())).thenReturn(0L);
        when(sessionRepository.countByIntensityAndDateBetween(any(), any(), any())).thenReturn(0L);
        when(sessionRepository.findDistinctDatesByDateBetween(any(), any())).thenReturn(List.of());
        when(sessionRepository.countPainFlagsByDateBetween(any(), any())).thenReturn(List.of());

        AnalyticsResponse result = analyticsService.getAnalytics(TODAY);

        assertEquals(0, result.getDaysSinceLastRestDay());
    }

    @Test
    void daysSinceLastRestDay_countsDaysWithConsecutiveSessions() {
        // Sessions on today (28th), yesterday (27th), day before (26th) — rest day on 25th
        when(sessionRepository.countByDateBetween(any(), any())).thenReturn(0L);
        when(sessionRepository.countByIntensityAndDateBetween(any(), any(), any())).thenReturn(0L);
        // For the daysSinceLastRestDay call, return dates that include today, yesterday, day before
        when(sessionRepository.findDistinctDatesByDateBetween(any(), eq(TODAY)))
            .thenReturn(List.of(TODAY, TODAY.minusDays(1), TODAY.minusDays(2)));
        // For weeklySessionCounts call
        when(sessionRepository.findDistinctDatesByDateBetween(any(), eq(WEEK_START.plusDays(6))))
            .thenReturn(List.of(TODAY, TODAY.minusDays(1), TODAY.minusDays(2)));
        when(sessionRepository.countPainFlagsByDateBetween(any(), any())).thenReturn(List.of());

        AnalyticsResponse result = analyticsService.getAnalytics(TODAY);

        assertEquals(3, result.getDaysSinceLastRestDay());
    }

    @Test
    void painFlagsLast30Days_returnsLocationCounts() {
        when(sessionRepository.countByDateBetween(any(), any())).thenReturn(0L);
        when(sessionRepository.countByIntensityAndDateBetween(any(), any(), any())).thenReturn(0L);
        when(sessionRepository.findDistinctDatesByDateBetween(any(), any())).thenReturn(List.of());
        when(sessionRepository.countPainFlagsByDateBetween(any(), any()))
            .thenReturn(List.of(
                new Object[]{"finger", 5L},
                new Object[]{"elbow", 2L}
            ));

        AnalyticsResponse result = analyticsService.getAnalytics(TODAY);

        List<PainFlagCount> painFlags = result.getPainFlagsLast30Days();
        assertEquals(2, painFlags.size());
        assertEquals("finger", painFlags.get(0).getLocation());
        assertEquals(5, painFlags.get(0).getCount());
        assertEquals("elbow", painFlags.get(1).getLocation());
        assertEquals(2, painFlags.get(1).getCount());
    }

    @Test
    void weeklySessionCounts_returns8WeeksOfData() {
        when(sessionRepository.countByDateBetween(any(), any())).thenReturn(0L);
        when(sessionRepository.countByIntensityAndDateBetween(any(), any(), any())).thenReturn(0L);
        when(sessionRepository.findDistinctDatesByDateBetween(any(), any())).thenReturn(List.of());
        when(sessionRepository.countPainFlagsByDateBetween(any(), any())).thenReturn(List.of());

        AnalyticsResponse result = analyticsService.getAnalytics(TODAY);

        List<WeeklySessionCount> weekly = result.getWeeklySessionCounts();
        assertEquals(8, weekly.size());
        // Last entry should be current week
        assertEquals(WEEK_START, weekly.get(7).getWeekStart());
        // First entry should be 7 weeks before current week
        assertEquals(WEEK_START.minusWeeks(7), weekly.get(0).getWeekStart());
    }

    @Test
    void weeklySessionCounts_countsSessionsPerWeek() {
        when(sessionRepository.countByDateBetween(any(), any())).thenReturn(0L);
        when(sessionRepository.countByIntensityAndDateBetween(any(), any(), any())).thenReturn(0L);
        // For daysSinceLastRestDay — no sessions
        when(sessionRepository.findDistinctDatesByDateBetween(any(), eq(TODAY)))
            .thenReturn(List.of());
        // For weeklySessionCounts — 2 sessions in current week, 1 in previous week
        when(sessionRepository.findDistinctDatesByDateBetween(any(), eq(WEEK_START.plusDays(6))))
            .thenReturn(List.of(
                WEEK_START,           // Monday current week
                WEEK_START.plusDays(2), // Wednesday current week
                WEEK_START.minusDays(3) // Friday previous week
            ));
        when(sessionRepository.countPainFlagsByDateBetween(any(), any())).thenReturn(List.of());

        AnalyticsResponse result = analyticsService.getAnalytics(TODAY);

        List<WeeklySessionCount> weekly = result.getWeeklySessionCounts();
        assertEquals(2, weekly.get(7).getCount()); // current week
        assertEquals(1, weekly.get(6).getCount()); // previous week
        assertEquals(0, weekly.get(5).getCount()); // two weeks ago
    }
}
