import { supabase } from "@/lib/supabase"
import type { CurrentPlanWeek, PlanWeekReview, TrainingPlan, TrainingPlanInput, TrainingPlanPatch } from "./types"

/** The plan with the given id, or the active plan when none is given. Null when there is none. */
export async function fetchTrainingPlan(planId?: string): Promise<TrainingPlan | null> {
    const { data, error } = await supabase.rpc("training_plan", { p_plan_id: planId ?? null })

    if (error) {
        throw new Error("Failed to fetch training plan")
    }

    return (data as TrainingPlan | null) ?? null
}

/** This week's bucket of the active plan. `today` is the local date (`todayLocal()`). */
export async function fetchCurrentPlanWeek(today: string): Promise<CurrentPlanWeek | null> {
    const { data, error } = await supabase.rpc("current_plan_week", { p_today: today })

    if (error) {
        throw new Error("Failed to fetch current plan week")
    }

    return (data as CurrentPlanWeek | null) ?? null
}

export async function fetchPlanWeekReview(planId: string, week: number): Promise<PlanWeekReview | null> {
    const { data, error } = await supabase.rpc("plan_week_review", { p_plan_id: planId, p_week_index: week })

    if (error) {
        throw new Error("Failed to fetch plan week review")
    }

    return (data as PlanWeekReview | null) ?? null
}

/** Creates the plan and makes it the active one; the previous plan is archived. */
export async function createTrainingPlan(plan: TrainingPlanInput): Promise<string> {
    const { data, error } = await supabase.rpc("create_training_plan", { p_plan: plan })

    if (error) {
        throw new Error(`Failed to create training plan: ${error.message}`)
    }

    return data as string
}

export async function updateTrainingPlan(planId: string, patch: TrainingPlanPatch): Promise<void> {
    const { error } = await supabase.rpc("update_training_plan", { p_plan_id: planId, p_patch: patch })

    if (error) {
        throw new Error(`Failed to update training plan: ${error.message}`)
    }
}
