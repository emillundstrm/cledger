import { useState } from "react"
import type { JournalEntryRequest } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import TagInput from "@/components/notes/TagInput"
import { todayLocal } from "@/lib/dates"
import { cn } from "@/lib/utils"

function ScalePicker({
    label,
    value,
    onChange,
}: {
    label: string
    value: number | null
    onChange: (value: number | null) => void
}) {
    return (
        <div role="group" aria-label={label} className="flex items-center gap-1">
            <span className="w-14 text-xs text-muted-foreground">{label}</span>
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    aria-pressed={value === n}
                    aria-label={`${label} ${n}`}
                    onClick={() => onChange(value === n ? null : n)}
                    className={cn(
                        "size-8 rounded-full border text-xs transition-colors",
                        value === n
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:text-foreground",
                    )}
                >
                    {n}
                </button>
            ))}
        </div>
    )
}

/** Writing and editing journal entries. Only the text is required. */
function JournalEntryForm({
    idPrefix,
    initial,
    tagSuggestions,
    submitLabel,
    isPending,
    onSubmit,
    onCancel,
}: {
    idPrefix: string
    initial?: JournalEntryRequest
    tagSuggestions: string[]
    submitLabel: string
    isPending?: boolean
    onSubmit: (data: JournalEntryRequest) => void
    onCancel?: () => void
}) {
    const [entryDate, setEntryDate] = useState(initial?.entryDate ?? todayLocal())
    const [content, setContent] = useState(initial?.content ?? "")
    const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
    const [mood, setMood] = useState<number | null>(initial?.mood ?? null)
    const [energy, setEnergy] = useState<number | null>(initial?.energy ?? null)
    const [showDetails, setShowDetails] = useState(
        initial !== undefined && (initial.tags.length > 0 || initial.mood !== null || initial.energy !== null),
    )

    const canSubmit = content.trim() !== "" && entryDate !== "" && !isPending

    return (
        <form
            className="space-y-3"
            onSubmit={(e) => {
                e.preventDefault()
                if (!canSubmit) {
                    return
                }
                onSubmit({ entryDate, content, tags, mood, energy })
                if (!initial) {
                    setContent("")
                    setTags([])
                    setMood(null)
                    setEnergy(null)
                }
            }}
        >
            <label htmlFor={`${idPrefix}-content`} className="sr-only">Entry</label>
            <Textarea
                id={`${idPrefix}-content`}
                className="min-h-[110px]"
                placeholder="How was the day?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />
            {showDetails ? (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <ScalePicker label="Mood" value={mood} onChange={setMood} />
                        <ScalePicker label="Energy" value={energy} onChange={setEnergy} />
                    </div>
                    <div>
                        <label htmlFor={`${idPrefix}-tags`} className="text-xs font-medium">Tags</label>
                        <div className="mt-1">
                            <TagInput
                                id={`${idPrefix}-tags`}
                                value={tags}
                                onChange={setTags}
                                suggestions={tagSuggestions}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowDetails(true)}
                >
                    + Mood, energy, tags
                </button>
            )}
            <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={!canSubmit}>{submitLabel}</Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                )}
                <label htmlFor={`${idPrefix}-date`} className="ml-auto text-xs text-muted-foreground">
                    Date
                </label>
                <Input
                    id={`${idPrefix}-date`}
                    type="date"
                    className="w-auto"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                />
            </div>
        </form>
    )
}

export default JournalEntryForm
