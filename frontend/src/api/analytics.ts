import { supabase } from "@/lib/supabase"
import type { Analytics, PainFlagCount, WeeklySessionCount, WeeklyTrainingLoad, WeeklyTrend } from "./types"

export async function fetchAnalytics(): Promise<Analytics> {
    const [
        sessionsThisWeekResult,
        hardSessionsResult,
        currentWeekLoadResult,
        painFlagsResult,
        weeklyCountsResult,
        weeklyLoadResult,
        performanceTrendResult,
        productivityTrendResult,
    ] = await Promise.all([
        supabase.rpc("sessions_this_week"),
        supabase.rpc("hard_sessions_last_7_days"),
        supabase.rpc("current_week_training_load"),
        supabase.rpc("pain_flags_last_30_days"),
        supabase.rpc("weekly_session_counts"),
        supabase.rpc("weekly_training_load"),
        supabase.rpc("performance_trend"),
        supabase.rpc("productivity_trend"),
    ])

    if (sessionsThisWeekResult.error) {
        throw new Error("Failed to fetch sessionsThisWeek")
    }
    if (hardSessionsResult.error) {
        throw new Error("Failed to fetch hardSessionsLast7Days")
    }
    if (currentWeekLoadResult.error) {
        throw new Error("Failed to fetch currentWeekTrainingLoad")
    }
    if (painFlagsResult.error) {
        throw new Error("Failed to fetch painFlagsLast30Days")
    }
    if (weeklyCountsResult.error) {
        throw new Error("Failed to fetch weeklySessionCounts")
    }
    if (weeklyLoadResult.error) {
        throw new Error("Failed to fetch weeklyTrainingLoad")
    }
    if (performanceTrendResult.error) {
        throw new Error("Failed to fetch performanceTrend")
    }
    if (productivityTrendResult.error) {
        throw new Error("Failed to fetch productivityTrend")
    }

    const painFlags = (painFlagsResult.data as { location: string; count: number; weighted_count: number }[]).map(
        (r): PainFlagCount => ({ location: r.location, count: r.count, weightedCount: r.weighted_count })
    )

    const weeklyCounts = (weeklyCountsResult.data as { week_start: string; count: number }[]).map(
        (r): WeeklySessionCount => ({ weekStart: r.week_start, count: r.count })
    )

    const weeklyLoad = (weeklyLoadResult.data as { week_start: string; load: number }[]).map(
        (r): WeeklyTrainingLoad => ({ weekStart: r.week_start, load: r.load })
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
        currentWeekTrainingLoad: currentWeekLoadResult.data as number,
        painFlagsLast30Days: painFlags,
        weeklySessionCounts: weeklyCounts,
        weeklyTrainingLoad: weeklyLoad,
        performanceTrend,
        productivityTrend,
    }
}
