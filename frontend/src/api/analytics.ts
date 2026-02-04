import { supabase } from "@/lib/supabase"
import type { Analytics, PainFlagCount, WeeklySessionCount, WeeklyTrend } from "./types"

export async function fetchAnalytics(): Promise<Analytics> {
    const [
        sessionsThisWeekResult,
        hardSessionsResult,
        painFlagsResult,
        weeklyCountsResult,
        performanceTrendResult,
        productivityTrendResult,
    ] = await Promise.all([
        supabase.rpc("sessions_this_week"),
        supabase.rpc("hard_sessions_last_7_days"),
        supabase.rpc("pain_flags_last_30_days"),
        supabase.rpc("weekly_session_counts"),
        supabase.rpc("performance_trend"),
        supabase.rpc("productivity_trend"),
    ])

    if (sessionsThisWeekResult.error) {
        throw new Error("Failed to fetch sessionsThisWeek")
    }
    if (hardSessionsResult.error) {
        throw new Error("Failed to fetch hardSessionsLast7Days")
    }
    if (painFlagsResult.error) {
        throw new Error("Failed to fetch painFlagsLast30Days")
    }
    if (weeklyCountsResult.error) {
        throw new Error("Failed to fetch weeklySessionCounts")
    }
    if (performanceTrendResult.error) {
        throw new Error("Failed to fetch performanceTrend")
    }
    if (productivityTrendResult.error) {
        throw new Error("Failed to fetch productivityTrend")
    }

    const painFlags = (painFlagsResult.data as { location: string; count: number }[]).map(
        (r): PainFlagCount => ({ location: r.location, count: r.count })
    )

    const weeklyCounts = (weeklyCountsResult.data as { week_start: string; count: number }[]).map(
        (r): WeeklySessionCount => ({ weekStart: r.week_start, count: r.count })
    )

    const performanceTrend = (performanceTrendResult.data as { week_start: string; average: number | null }[]).map(
        (r): WeeklyTrend => ({ weekStart: r.week_start, average: r.average })
    )

    const productivityTrend = (productivityTrendResult.data as { week_start: string; average: number | null }[]).map(
        (r): WeeklyTrend => ({ weekStart: r.week_start, average: r.average })
    )

    return {
        sessionsThisWeek: sessionsThisWeekResult.data as number,
        hardSessionsLast7Days: hardSessionsResult.data as number,
        daysSinceLastRestDay: 0, // Not needed per PRD US-005
        painFlagsLast30Days: painFlags,
        weeklySessionCounts: weeklyCounts,
        performanceTrend,
        productivityTrend,
    }
}
