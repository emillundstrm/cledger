import { useState } from "react"
import { format, parseISO } from "date-fns"
import type { Task, TaskRequest } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import NoteMarkdown from "@/components/notes/NoteMarkdown"
import { daysFromToday } from "@/lib/dates"
import { cn } from "@/lib/utils"

function DueBadge({ dueDate, done }: { dueDate: string; done: boolean }) {
    const days = daysFromToday(dueDate)
    const label = days === 0
        ? "Today"
        : days === 1
            ? "Tomorrow"
            : format(parseISO(dueDate), "d MMM")
    const overdue = !done && days < 0

    return (
        <span
            className={cn(
                "shrink-0 text-xs",
                overdue ? "font-medium text-destructive" : days <= 1 && !done ? "text-primary" : "text-dim",
            )}
        >
            {overdue ? `Overdue · ${label}` : label}
        </span>
    )
}

function TaskItem({
    task,
    showList,
    lists,
    expanded,
    onToggleExpanded,
    onToggleDone,
    onSave,
    onArchive,
    onDelete,
}: {
    task: Task
    showList: boolean
    lists: string[]
    expanded: boolean
    onToggleExpanded: () => void
    onToggleDone: () => void
    onSave: (data: TaskRequest) => void
    onArchive: (archived: boolean) => void
    onDelete: () => void
}) {
    const done = task.status === "done"
    const archived = task.archivedAt !== null

    return (
        <li className={cn("rounded-xl border border-border bg-card", archived && "opacity-60")}>
            <div className="flex items-center gap-3 px-3 py-2.5">
                <input
                    type="checkbox"
                    className="size-5 shrink-0 cursor-pointer accent-[var(--primary)]"
                    checked={done}
                    onChange={onToggleDone}
                    aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
                />
                <button
                    type="button"
                    className={cn(
                        "min-w-0 flex-1 truncate text-left text-sm",
                        done && "text-muted-foreground line-through",
                    )}
                    onClick={onToggleExpanded}
                    aria-expanded={expanded}
                >
                    {task.title}
                </button>
                {task.notes && !expanded && (
                    <span aria-hidden="true" className="text-xs text-dim">¶</span>
                )}
                {showList && (
                    <Badge variant="outline" className="shrink-0 text-xs font-normal">{task.list}</Badge>
                )}
                {archived && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Archived
                    </span>
                )}
                {task.dueDate && <DueBadge dueDate={task.dueDate} done={done} />}
            </div>
            {expanded && (
                <TaskEditor
                    task={task}
                    lists={lists}
                    onSave={onSave}
                    onArchive={onArchive}
                    onDelete={onDelete}
                />
            )}
        </li>
    )
}

function TaskEditor({
    task,
    lists,
    onSave,
    onArchive,
    onDelete,
}: {
    task: Task
    lists: string[]
    onSave: (data: TaskRequest) => void
    onArchive: (archived: boolean) => void
    onDelete: () => void
}) {
    const [editing, setEditing] = useState(false)
    const [title, setTitle] = useState(task.title)
    const [notes, setNotes] = useState(task.notes ?? "")
    const [list, setList] = useState(task.list)
    const [dueDate, setDueDate] = useState(task.dueDate ?? "")
    const archived = task.archivedAt !== null
    const datalistId = `task-lists-${task.id}`

    if (!editing) {
        return (
            <div className="space-y-3 border-t border-border px-3 py-3">
                {task.notes
                    ? <NoteMarkdown content={task.notes} />
                    : <p className="text-sm text-muted-foreground">No notes.</p>}
                <p className="text-xs text-dim">
                    {task.source === "assistant" ? "Added by the assistant" : "Added by you"}
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => onArchive(!archived)}>
                        {archived ? "Restore" : "Archive"}
                    </Button>
                    {archived && (
                        <Button size="sm" variant="destructive" onClick={onDelete}>
                            Delete permanently
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <form
            className="space-y-3 border-t border-border px-3 py-3"
            onSubmit={(e) => {
                e.preventDefault()
                if (title.trim() && list.trim()) {
                    onSave({
                        title: title.trim(),
                        notes: notes.trim() === "" ? null : notes,
                        list: list.trim().toLowerCase(),
                        dueDate: dueDate === "" ? null : dueDate,
                    })
                    setEditing(false)
                }
            }}
        >
            <div>
                <label htmlFor={`task-title-${task.id}`} className="text-xs font-medium">Title</label>
                <Input id={`task-title-${task.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
                <label htmlFor={`task-notes-${task.id}`} className="text-xs font-medium">Notes</label>
                <Textarea id={`task-notes-${task.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label htmlFor={`task-list-${task.id}`} className="text-xs font-medium">List</label>
                    <Input
                        id={`task-list-${task.id}`}
                        list={datalistId}
                        value={list}
                        onChange={(e) => setList(e.target.value)}
                    />
                    <datalist id={datalistId}>
                        {lists.map((l) => <option key={l} value={l} />)}
                    </datalist>
                </div>
                <div>
                    <label htmlFor={`task-due-${task.id}`} className="text-xs font-medium">Due</label>
                    <Input
                        id={`task-due-${task.id}`}
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <Button size="sm" type="submit" disabled={!title.trim() || !list.trim()}>Save</Button>
                <Button size="sm" type="button" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}

export default TaskItem
