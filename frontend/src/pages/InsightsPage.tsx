import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring"
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
}: {
    insight: Insight
    onEdit: (insight: Insight) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const isLong = insight.content.length > 200

    return (
        <Card
            className="py-3 hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onEdit(insight)}
        >
            <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm whitespace-pre-wrap">
                            {isLong && !expanded
                                ? insight.content.slice(0, 200) + "..."
                                : insight.content}
                        </p>
                        {isLong && (
                            <button
                                className="text-xs text-muted-foreground hover:text-foreground mt-1"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setExpanded(!expanded)
                                }}
                            >
                                {expanded ? "Show less" : "Show more"}
                            </button>
                        )}
                    </div>
                    {insight.pinned && (
                        <Badge variant="secondary">Pinned</Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    Updated {formatTimestamp(insight.updatedAt)}
                </p>
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
                <h2 className="text-2xl font-bold tracking-tight">Add Insight</h2>
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
                <h2 className="text-2xl font-bold tracking-tight">Edit Insight</h2>
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
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Insights</h2>
                <Button onClick={() => setViewMode("add")}>Add Insight</Button>
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
                <div className="space-y-2">
                    {insights.map((insight) => (
                        <InsightCard
                            key={insight.id}
                            insight={insight}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default InsightsPage
