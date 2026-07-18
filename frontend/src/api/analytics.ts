import { supabase } from "@/lib/supabase"
import type {
    Analytics,
    PainFlagCount,
    Period,
    SessionPerformanceLog,
    SessionTypeVolume,
    WeeklyTrainingLoad,
} from "./types"

export async function fetchAnalytics(period: Period = "8w"): Promise<Analytics> {
    const [
        sessionsThisWeekResult,
        hardSessionsResult,
        currentWeekLoadResult,
        painFlagsResult,
        sessionTypeVolumeResult,
        performanceLogResult,
        weeklyLoadResult,
    ] = await Promise.all([
        supabase.rpc("sessions_this_week"),
        supabase.rpc("hard_sessions_last_7_days"),
        supabase.rpc("current_week_training_load"),
        supabase.rpc("pain_flags_last_30_days"),
        supabase.rpc("session_type_volume", { period }),
        supabase.rpc("session_performance_log", { period }),
        supabase.rpc("weekly_training_load", { period }),
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
    if (sessionTypeVolumeResult.error) {
        throw new Error("Failed to fetch sessionTypeVolume")
    }
    if (performanceLogResult.error) {
        throw new Error("Failed to fetch sessionPerformanceLog")
    }
    if (weeklyLoadResult.error) {
        throw new Error("Failed to fetch weeklyTrainingLoad")
    }

    const painFlags = (painFlagsResult.data as { location: string; count: number; weighted_count: number }[]).map(
        (r): PainFlagCount => ({ location: r.location, count: r.count, weightedCount: r.weighted_count })
    )

    const sessionTypeVolume = (
        sessionTypeVolumeResult.data as { week_start: string; type: string; session_count: number; total_minutes: number }[]
    ).map(
        (r): SessionTypeVolume => ({
            weekStart: r.week_start,
            type: r.type,
            sessionCount: r.session_count,
            totalMinutes: r.total_minutes,
        })
    )

    const sessionPerformanceLog = (
        performanceLogResult.data as { session_date: string; performance: string }[]
    ).map(
        (r): SessionPerformanceLog => ({ date: r.session_date, performance: r.performance })
    )

    const weeklyLoad = (weeklyLoadResult.data as { week_start: string; load: number }[]).map(
        (r): WeeklyTrainingLoad => ({ weekStart: r.week_start, load: r.load })
    )

    return {
        sessionsThisWeek: sessionsThisWeekResult.data as number,
        hardSessionsLast7Days: hardSessionsResult.data as number,
        currentWeekTrainingLoad: currentWeekLoadResult.data as number,
        painFlagsLast30Days: painFlags,
        sessionTypeVolume,
        sessionPerformanceLog,
        weeklyTrainingLoad: weeklyLoad,
    }
}
