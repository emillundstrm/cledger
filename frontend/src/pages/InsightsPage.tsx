import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import ReactMarkdown from "react-markdown"
import { fetchInsights, createInsight, updateInsight, deleteInsight } from "@/api/insights"
import type { Insight } from "@/api/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function formatTimestamp(ts: string): string {
    const date = new Date(ts)
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })
}

function InsightForm({
    initialContent,
    initialPinned,
    onSubmit,
    onCancel,
    submitLabel,
}: {
    initialContent?: string
    initialPinned?: boolean
    onSubmit: (content: string, pinned: boolean) => void
    onCancel: () => void
    submitLabel: string
}) {
    const [content, setContent] = useState(initialContent ?? "")
    const [pinned, setPinned] = useState(initialPinned ?? false)

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="insight-content" className="text-sm font-medium">
                    Content
                </label>
                <textarea
                    id="insight-content"
                    className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm min-h-[120px] transition-[border-color,box-shadow] focus:outline-none focus:ring-2 focus:ring-ring"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your coaching insight..."
                />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="insight-pinned"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="rounded"
                />
                <label htmlFor="insight-pinned" className="text-sm">
                    Pin this insight
                </label>
            </div>
            <div className="flex gap-2">
                <Button
                    onClick={() => onSubmit(content, pinned)}
                    disabled={!content.trim()}
                >
                    {submitLabel}
                </Button>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </div>
    )
}

function InsightCard({
    insight,
    onEdit,
    delayMs,
}: {
    insight: Insight
    onEdit: (insight: Insight) => void
    delayMs: number
}) {
    const [expanded, setExpanded] = useState(false)
    const isLong = insight.content.length > 200

    return (
        <Card
            className={`session-card anim-fade-up gap-0 rounded-[14px] px-1 py-4 ${insight.pinned ? "accent-pinned" : ""} ${isLong ? "cursor-pointer" : ""}`}
            style={{ animationDelay: `${delayMs}ms` }}
            onClick={() => {
                if (isLong) {
                    setExpanded(!expanded)
                }
            }}
        >
            <CardContent className="space-y-2">
                <div className="flex items-center gap-2.5">
                    {insight.pinned && (
                        <Badge
                            variant="ghost"
                            className="gap-1 px-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                        >
                            <span aria-hidden="true">⌖</span>
                            <span>Pinned</span>
                        </Badge>
                    )}
                    <span className="ml-auto text-xs text-dim">
                        Updated {formatTimestamp(insight.updatedAt)}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit(insight)
                        }}
                    >
                        Edit
                    </Button>
                </div>
                <div className="text-sm prose-insight">
                    <ReactMarkdown>
                        {isLong && !expanded
                            ? insight.content.slice(0, 200) + "..."
                            : insight.content}
                    </ReactMarkdown>
                </div>
                {isLong && (
                    <span className="block text-xs font-medium text-primary">
                        <span>{expanded ? "Click to collapse" : "Click to expand"}</span>{" "}
                        <span aria-hidden="true">{expanded ? "↑" : "↓"}</span>
                    </span>
                )}
            </CardContent>
        </Card>
    )
}

type ViewMode = "list" | "add" | "edit"

function InsightsPage() {
    const queryClient = useQueryClient()
    const [viewMode, setViewMode] = useState<ViewMode>("list")
    const [editingInsight, setEditingInsight] = useState<Insight | null>(null)

    const { data: insights, isLoading, isError } = useQuery({
        queryKey: ["insights"],
        queryFn: fetchInsights,
    })

    const createMutation = useMutation({
        mutationFn: (data: { content: string; pinned: boolean }) =>
            createInsight(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["insights"] })
            setViewMode("list")
        },
    })

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; content: string; pinned: boolean }) =>
            updateInsight(data.id, { content: data.content, pinned: data.pinned }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["insights"] })
            setViewMode("list")
            setEditingInsight(null)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteInsight(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["insights"] })
            setViewMode("list")
            setEditingInsight(null)
        },
    })

    const handleEdit = (insight: Insight) => {
        setEditingInsight(insight)
        setViewMode("edit")
    }

    if (viewMode === "add") {
        return (
            <div className="space-y-6">
                <h2 className="anim-fade-up font-display text-4xl">Add Insight</h2>
                <InsightForm
                    submitLabel="Save Insight"
                    onSubmit={(content, pinned) =>
                        createMutation.mutate({ content, pinned })
                    }
                    onCancel={() => setViewMode("list")}
                />
                {createMutation.isError && (
                    <p className="text-destructive">Failed to save insight.</p>
                )}
            </div>
        )
    }

    if (viewMode === "edit" && editingInsight) {
        return (
            <div className="space-y-6">
                <h2 className="anim-fade-up font-display text-4xl">Edit Insight</h2>
                <InsightForm
                    initialContent={editingInsight.content}
                    initialPinned={editingInsight.pinned}
                    submitLabel="Update Insight"
                    onSubmit={(content, pinned) =>
                        updateMutation.mutate({
                            id: editingInsight.id,
                            content,
                            pinned,
                        })
                    }
                    onCancel={() => {
                        setViewMode("list")
                        setEditingInsight(null)
                    }}
                />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Insight</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this insight? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() =>
                                    deleteMutation.mutate(editingInsight.id)
                                }
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                {updateMutation.isError && (
                    <p className="text-destructive">Failed to update insight.</p>
                )}
                {deleteMutation.isError && (
                    <p className="text-destructive">Failed to delete insight.</p>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="anim-fade-up flex items-center justify-between">
                <h2 className="font-display text-4xl">Insights</h2>
                <Button onClick={() => setViewMode("add")}>
                    <span aria-hidden="true">+</span> <span>Add Insight</span>
                </Button>
            </div>

            {isLoading && (
                <p className="text-muted-foreground">Loading insights...</p>
            )}

            {isError && (
                <p className="text-destructive">Failed to load insights.</p>
            )}

            {insights && insights.length === 0 && (
                <p className="text-muted-foreground">
                    No insights yet. Your training coach can add insights here.
                </p>
            )}

            {insights && insights.length > 0 && (
                <div className="space-y-3">
                    {insights.map((insight, index) => (
                        <InsightCard
                            key={insight.id}
                            insight={insight}
                            onEdit={handleEdit}
                            delayMs={index * 70}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default InsightsPage
