import { supabase } from "@/lib/supabase"
import type { Task, TaskList, TaskRequest, TaskRow, TaskStatus } from "./types"
import { mapTaskRow } from "./types"

/** Open tasks first by due date (undated last), then done tasks most recent first. */
export async function fetchTasks(includeArchived: boolean): Promise<Task[]> {
    let query = supabase
        .from("tasks")
        .select("*")
        .order("status", { ascending: false })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("completed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true })

    if (!includeArchived) {
        query = query.is("archived_at", null)
    }

    const { data, error } = await query

    if (error) {
        throw new Error("Failed to fetch tasks")
    }

    return (data as TaskRow[]).map(mapTaskRow)
}

export async function fetchTaskLists(): Promise<TaskList[]> {
    const { data, error } = await supabase.rpc("task_lists")

    if (error) {
        throw new Error("Failed to fetch task lists")
    }

    return (data as { list: string; open_count: number; total_count: number }[]).map((row) => ({
        list: row.list,
        openCount: Number(row.open_count),
        totalCount: Number(row.total_count),
    }))
}

export async function createTask(data: TaskRequest): Promise<Task> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("Not authenticated")
    }

    const { data: row, error } = await supabase
        .from("tasks")
        .insert({
            user_id: user.id,
            list: data.list,
            title: data.title,
            notes: data.notes,
            due_date: data.dueDate,
            source: "user",
        })
        .select()
        .single()

    if (error) {
        throw new Error("Failed to create task")
    }

    return mapTaskRow(row as TaskRow)
}

export async function updateTask(id: string, data: TaskRequest): Promise<Task> {
    return patchTask(id, {
        list: data.list,
        title: data.title,
        notes: data.notes,
        due_date: data.dueDate,
    })
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return patchTask(id, { status })
}

export async function setTaskArchived(id: string, archived: boolean): Promise<Task> {
    return patchTask(id, { archived_at: archived ? new Date().toISOString() : null })
}

export async function deleteTask(id: string): Promise<void> {
    const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)

    if (error) {
        throw new Error("Failed to delete task")
    }
}

async function patchTask(id: string, patch: Record<string, unknown>): Promise<Task> {
    const { data: row, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select()
        .single()

    if (error) {
        throw new Error("Failed to update task")
    }

    return mapTaskRow(row as TaskRow)
}
