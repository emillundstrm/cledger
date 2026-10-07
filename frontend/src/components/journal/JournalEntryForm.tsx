import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { JournalEntryRequest } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import TagInput from "@/components/notes/TagInput"
import { FormActions, FormError, FormField, FormLayout } from "@/components/system/Form"
import { todayLocal } from "@/lib/dates"
import { cn } from "@/lib/utils"

/**
 * A 1–5 scale. Pills rather than a SegmentedControl: the value is optional and
 * pressing the selected pill clears it, which a radio group can't express.
 */
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
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    aria-pressed={value === n}
                    aria-label={`${label} ${n}`}
                    onClick={() => onChange(value === n ? null : n)}
                    className={cn(
                        "size-8 cursor-pointer rounded-full border text-xs font-medium tabular-nums outline-none transition-[color,background-color,border-color,transform] duration-150 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        value === n
                            ? "border-muted-foreground/60 bg-accent text-foreground"
                            : "border-border text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground",
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
    contentLabel = "Inlägg",
    submitLabel,
    isPending,
    error,
    onSubmit,
    onCancel,
}: {
    idPrefix: string
    initial?: JournalEntryRequest
    tagSuggestions: string[]
    contentLabel?: string
    submitLabel: string
    isPending?: boolean
    error?: string
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
    const detailsId = `${idPrefix}-details`

    return (
        <FormLayout
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
            <FormField label={contentLabel} htmlFor={`${idPrefix}-content`}>
                <Textarea
                    id={`${idPrefix}-content`}
                    className="min-h-[110px]"
                    placeholder="Hur var dagen?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </FormField>
            <FormField label="Datum" htmlFor={`${idPrefix}-date`}>
                <Input
                    id={`${idPrefix}-date`}
                    type="date"
                    className="w-auto"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                />
            </FormField>
            <div className="space-y-6">
                <button
                    type="button"
                    aria-expanded={showDetails}
                    aria-controls={detailsId}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    onClick={() => setShowDetails(!showDetails)}
                >
                    Humör, energi, taggar
                    <ChevronDown
                        aria-hidden="true"
                        className={cn(
                            "size-4 transition-transform duration-200",
                            showDetails ? "rotate-180" : "rotate-0",
                        )}
                    />
                </button>
                {showDetails && (
                    <div id={detailsId} className="space-y-6">
                        <div className="flex flex-wrap gap-x-8 gap-y-6">
                            <FormField label="Humör">
                                <ScalePicker label="Humör" value={mood} onChange={setMood} />
                            </FormField>
                            <FormField label="Energi">
                                <ScalePicker label="Energi" value={energy} onChange={setEnergy} />
                            </FormField>
                        </div>
                        <FormField label="Taggar" htmlFor={`${idPrefix}-tags`}>
                            <TagInput
                                id={`${idPrefix}-tags`}
                                value={tags}
                                onChange={setTags}
                                suggestions={tagSuggestions}
                            />
                        </FormField>
                    </div>
                )}
            </div>
            {error && <FormError>{error}</FormError>}
            <FormActions>
                <Button type="submit" disabled={!canSubmit}>{submitLabel}</Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>
                )}
            </FormActions>
        </FormLayout>
    )
}

export default JournalEntryForm
