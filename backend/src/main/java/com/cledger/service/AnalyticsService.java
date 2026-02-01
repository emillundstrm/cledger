package com.cledger.service;

import com.cledger.dto.AnalyticsResponse;
import com.cledger.dto.AnalyticsResponse.PainFlagCount;
import com.cledger.dto.AnalyticsResponse.WeeklySessionCount;
import com.cledger.dto.AnalyticsResponse.WeeklyTrend;
import com.cledger.entity.Session;
import com.cledger.repository.SessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

@Service
public class AnalyticsService {

    private final SessionRepository sessionRepository;

    public AnalyticsService(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics() {
        return getAnalytics(LocalDate.now());
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics(LocalDate today) {
        AnalyticsResponse response = new AnalyticsResponse();

        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        response.setSessionsThisWeek((int) sessionRepository.countByDateBetween(weekStart, weekEnd));

        LocalDate sevenDaysAgo = today.minusDays(6);
        response.setHardSessionsLast7Days(
            (int) sessionRepository.countByIntensityAndDateBetween("hard", sevenDaysAgo, today)
        );

        response.setDaysSinceLastRestDay(computeDaysSinceLastRestDay(today));

        LocalDate thirtyDaysAgo = today.minusDays(29);
        List<Object[]> painFlagResults = sessionRepository.countPainFlagsByDateBetween(thirtyDaysAgo, today);
        List<PainFlagCount> painFlagCounts = new ArrayList<>();
        for (Object[] row : painFlagResults) {
            painFlagCounts.add(new PainFlagCount((String) row[0], (Long) row[1]));
        }
        response.setPainFlagsLast30Days(painFlagCounts);

        response.setWeeklySessionCounts(computeWeeklySessionCounts(today));

        LocalDate currentWeekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate eightWeeksAgoStart = currentWeekStart.minusWeeks(7);
        List<Session> trendSessions = sessionRepository.findByDateBetween(
            eightWeeksAgoStart, currentWeekStart.plusDays(6)
        );
        response.setPerformanceTrend(computeWeeklyTrend(trendSessions, today, Session::getPerformance, this::mapPerformanceToNumber));
        response.setProductivityTrend(computeWeeklyTrend(trendSessions, today, Session::getProductivity, this::mapProductivityToNumber));

        return response;
    }

    private int computeDaysSinceLastRestDay(LocalDate today) {
        // Look back up to a reasonable window (e.g. 365 days)
        LocalDate lookbackStart = today.minusDays(365);
        Set<LocalDate> sessionDates = Set.copyOf(
            sessionRepository.findDistinctDatesByDateBetween(lookbackStart, today)
        );

        int days = 0;
        LocalDate checkDate = today;
        while (checkDate.isAfter(lookbackStart)) {
            if (!sessionDates.contains(checkDate)) {
                return days;
            }
            days++;
            checkDate = checkDate.minusDays(1);
        }
        return days;
    }

    private List<WeeklySessionCount> computeWeeklySessionCounts(LocalDate today) {
        LocalDate currentWeekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate eightWeeksAgoStart = currentWeekStart.minusWeeks(7);

        List<LocalDate> sessionDates = sessionRepository.findDistinctDatesByDateBetween(
            eightWeeksAgoStart, currentWeekStart.plusDays(6)
        );

        List<WeeklySessionCount> counts = new ArrayList<>();
        for (int i = 7; i >= 0; i--) {
            LocalDate ws = currentWeekStart.minusWeeks(i);
            LocalDate we = ws.plusDays(6);
            long count = sessionDates.stream()
                .filter(d -> !d.isBefore(ws) && !d.isAfter(we))
                .count();
            counts.add(new WeeklySessionCount(ws, count));
        }

        return counts;
    }

    private List<WeeklyTrend> computeWeeklyTrend(
            List<Session> sessions,
            LocalDate today,
            Function<Session, String> valueExtractor,
            Function<String, Integer> mapper) {

        LocalDate currentWeekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        List<WeeklyTrend> trends = new ArrayList<>();
        for (int i = 7; i >= 0; i--) {
            LocalDate ws = currentWeekStart.minusWeeks(i);
            LocalDate we = ws.plusDays(6);

            List<Integer> values = sessions.stream()
                .filter(s -> !s.getDate().isBefore(ws) && !s.getDate().isAfter(we))
                .map(valueExtractor)
                .map(mapper)
                .toList();

            Double average = values.isEmpty() ? null :
                values.stream().mapToInt(Integer::intValue).average().orElse(0.0);

            trends.add(new WeeklyTrend(ws, average));
        }

        return trends;
    }

    private int mapPerformanceToNumber(String performance) {
        return switch (performance) {
            case "weak" -> 1;
            case "normal" -> 2;
            case "strong" -> 3;
            default -> 2;
        };
    }

    private int mapProductivityToNumber(String productivity) {
        return switch (productivity) {
            case "low" -> 1;
            case "normal" -> 2;
            case "high" -> 3;
            default -> 2;
        };
    }
}
