import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router"
import {
    createTask,
    deleteTask,
    fetchTaskLists,
    fetchTasks,
    setTaskArchived,
    setTaskStatus,
    updateTask,
} from "@/api/tasks"
import { DEFAULT_TASK_LIST, type Task, type TaskRequest, type TaskStatus } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import TaskItem from "@/components/tasks/TaskItem"
import { cn } from "@/lib/utils"

/** Remounts per linked task, so following a link to another task resets the view. */
function TasksPage() {
    const { id } = useParams()
    return <TasksView key={id ?? ""} linkedId={id} />
}

function TasksView({ linkedId }: { linkedId: string | undefined }) {
    const queryClient = useQueryClient()
    // A link to a single task shows all lists, so the task is visible wherever it lives.
    const [activeList, setActiveList] = useState<string | null>(linkedId ? null : DEFAULT_TASK_LIST)
    const [expandedId, setExpandedId] = useState<string | null>(linkedId ?? null)
    const [showDone, setShowDone] = useState(false)
    const [showArchived, setShowArchived] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [newDue, setNewDue] = useState("")

    const tasksQuery = useQuery({
        queryKey: ["tasks", { showArchived }],
        queryFn: () => fetchTasks(showArchived),
    })

    const { data: taskLists } = useQuery({
        queryKey: ["task-lists"],
        queryFn: fetchTaskLists,
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] })
        queryClient.invalidateQueries({ queryKey: ["task-lists"] })
        queryClient.invalidateQueries({ queryKey: ["search"] })
    }

    const createMutation = useMutation({
        mutationFn: (data: TaskRequest) => createTask(data),
        onSuccess: () => {
            invalidate()
            setNewTitle("")
            setNewDue("")
        },
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => setTaskStatus(id, status),
        onSuccess: invalidate,
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: TaskRequest }) => updateTask(id, data),
        onSuccess: invalidate,
    })

    const archiveMutation = useMutation({
        mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setTaskArchived(id, archived),
        onSuccess: invalidate,
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteTask(id),
        onSuccess: invalidate,
    })

    const lists = (taskLists ?? []).map((l) => l.list)
    if (!lists.includes(DEFAULT_TASK_LIST)) {
        lists.unshift(DEFAULT_TASK_LIST)
    }
    const visible = (tasksQuery.data ?? []).filter((t) => activeList === null || t.list === activeList)
    const open = visible.filter((t) => t.status === "open")
    const done = visible.filter((t) => t.status === "done")
    const linkedTaskIsDone = done.some((t) => t.id === linkedId)

    const renderTask = (task: Task) => (
        <TaskItem
            key={task.id}
            task={task}
            showList={activeList === null}
            lists={lists}
            expanded={expandedId === task.id}
            onToggleExpanded={() => setExpandedId(expandedId === task.id ? null : task.id)}
            onToggleDone={() => statusMutation.mutate({
                id: task.id,
                status: task.status === "open" ? "done" : "open",
            })}
            onSave={(data) => updateMutation.mutate({ id: task.id, data })}
            onArchive={(archived) => archiveMutation.mutate({ id: task.id, archived })}
            onDelete={() => deleteMutation.mutate(task.id)}
        />
    )

    const anyError = statusMutation.isError || updateMutation.isError || archiveMutation.isError
        || deleteMutation.isError

    return (
        <div className="space-y-6">
            <h2 className="font-display text-4xl">Tasks</h2>

            <div className="flex flex-wrap items-center gap-1.5">
                {[null, ...lists].map((list) => {
                    const count = list === null
                        ? (taskLists ?? []).reduce((sum, l) => sum + l.openCount, 0)
                        : taskLists?.find((l) => l.list === list)?.openCount ?? 0
                    const active = activeList === list
                    return (
                        <button
                            key={list ?? "__all"}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setActiveList(list)}
                            className={cn(
                                "rounded-full border px-3 py-1 text-sm transition-colors",
                                active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {list ?? "All"} <span className="opacity-70">{count}</span>
                        </button>
                    )
                })}
            </div>

            <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                    e.preventDefault()
                    if (newTitle.trim()) {
                        createMutation.mutate({
                            title: newTitle.trim(),
                            list: activeList ?? DEFAULT_TASK_LIST,
                            notes: null,
                            dueDate: newDue === "" ? null : newDue,
                        })
                    }
                }}
            >
                <Input
                    aria-label="New task"
                    className="min-w-0 flex-1 basis-48"
                    placeholder={`Add to ${activeList ?? DEFAULT_TASK_LIST}`}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                />
                <Input
                    aria-label="Due date"
                    type="date"
                    className="w-auto"
                    value={newDue}
                    onChange={(e) => setNewDue(e.target.value)}
                />
                <Button type="submit" disabled={!newTitle.trim() || createMutation.isPending}>
                    Add
                </Button>
            </form>
            {createMutation.isError && <p className="text-destructive">Failed to add task.</p>}
            {anyError && <p className="text-destructive">Failed to update task.</p>}

            {tasksQuery.isLoading && <p className="text-muted-foreground">Loading tasks...</p>}
            {tasksQuery.isError && <p className="text-destructive">Failed to load tasks.</p>}

            {tasksQuery.data && (
                <div className="space-y-4">
                    {open.length === 0 ? (
                        <p className="text-muted-foreground">Nothing to do here.</p>
                    ) : (
                        <ul className="space-y-2">{open.map(renderTask)}</ul>
                    )}

                    <div className="flex items-center gap-3">
                        {done.length > 0 && (
                            <button
                                type="button"
                                className="text-sm text-muted-foreground hover:text-foreground"
                                aria-expanded={showDone || linkedTaskIsDone}
                                onClick={() => setShowDone(!showDone)}
                            >
                                {showDone || linkedTaskIsDone ? "▾" : "▸"} Done ({done.length})
                            </button>
                        )}
                        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={(e) => setShowArchived(e.target.checked)}
                            />
                            Show archived
                        </label>
                    </div>
                    {(showDone || linkedTaskIsDone) && done.length > 0 && (
                        <ul className="space-y-2">{done.map(renderTask)}</ul>
                    )}
                </div>
            )}
        </div>
    )
}

export default TasksPage
