package com.cledger.dto;

import java.time.LocalDate;
import java.util.List;

public class AnalyticsResponse {

    private int sessionsThisWeek;
    private int hardSessionsLast7Days;
    private int daysSinceLastRestDay;
    private List<PainFlagCount> painFlagsLast30Days;
    private List<WeeklySessionCount> weeklySessionCounts;

    public int getSessionsThisWeek() {
        return sessionsThisWeek;
    }

    public void setSessionsThisWeek(int sessionsThisWeek) {
        this.sessionsThisWeek = sessionsThisWeek;
    }

    public int getHardSessionsLast7Days() {
        return hardSessionsLast7Days;
    }

    public void setHardSessionsLast7Days(int hardSessionsLast7Days) {
        this.hardSessionsLast7Days = hardSessionsLast7Days;
    }

    public int getDaysSinceLastRestDay() {
        return daysSinceLastRestDay;
    }

    public void setDaysSinceLastRestDay(int daysSinceLastRestDay) {
        this.daysSinceLastRestDay = daysSinceLastRestDay;
    }

    public List<PainFlagCount> getPainFlagsLast30Days() {
        return painFlagsLast30Days;
    }

    public void setPainFlagsLast30Days(List<PainFlagCount> painFlagsLast30Days) {
        this.painFlagsLast30Days = painFlagsLast30Days;
    }

    public List<WeeklySessionCount> getWeeklySessionCounts() {
        return weeklySessionCounts;
    }

    public void setWeeklySessionCounts(List<WeeklySessionCount> weeklySessionCounts) {
        this.weeklySessionCounts = weeklySessionCounts;
    }

    public static class PainFlagCount {

        private String location;
        private long count;

        public PainFlagCount() {
        }

        public PainFlagCount(String location, long count) {
            this.location = location;
            this.count = count;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public long getCount() {
            return count;
        }

        public void setCount(long count) {
            this.count = count;
        }
    }

    public static class WeeklySessionCount {

        private LocalDate weekStart;
        private long count;

        public WeeklySessionCount() {
        }

        public WeeklySessionCount(LocalDate weekStart, long count) {
            this.weekStart = weekStart;
            this.count = count;
        }

        public LocalDate getWeekStart() {
            return weekStart;
        }

        public void setWeekStart(LocalDate weekStart) {
            this.weekStart = weekStart;
        }

        public long getCount() {
            return count;
        }

        public void setCount(long count) {
            this.count = count;
        }
    }
}
