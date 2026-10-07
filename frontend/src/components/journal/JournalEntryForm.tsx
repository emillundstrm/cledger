import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { JournalEntryRequest } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import TagInput from "@/components/notes/TagInput"
import { FormActions, FormError, FormField, FormLayout } from "@/components/system/Form"
import { fieldErrorId } from "@/components/system/fieldErrorId"
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
                        "size-8 cursor-pointer rounded-full border text-xs font-medium tabular-nums outline-none transition-[color,background-color,border-color,transform] duration-150 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/80",
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

/**
 * Writing and editing journal entries. Only the text is required. The form
 * keeps what was written until saving succeeds, so a failed save loses nothing.
 */
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
    /** Saves; rejects if saving failed, and the form keeps its content. */
    onSubmit: (data: JournalEntryRequest) => Promise<void>
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

    // Field errors show once the user has tried to save, not while typing.
    const [attempted, setAttempted] = useState(false)
    const contentError = attempted && content.trim() === "" ? "Skriv något innan du sparar." : undefined
    const dateError = attempted && entryDate === "" ? "Välj ett datum." : undefined
    const detailsId = `${idPrefix}-details`
    const contentId = `${idPrefix}-content`
    const dateId = `${idPrefix}-date`

    const submit = async () => {
        setAttempted(true)
        if (content.trim() === "" || entryDate === "" || isPending) {
            return
        }
        try {
            await onSubmit({ entryDate, content, tags, mood, energy })
        } catch {
            // The page shows the error; what was written stays to retry.
            return
        }
        setAttempted(false)
        if (!initial) {
            setContent("")
            setTags([])
            setMood(null)
            setEnergy(null)
        }
    }

    return (
        <FormLayout
            noValidate
            onSubmit={(e) => {
                e.preventDefault()
                void submit()
            }}
        >
            <FormField label={contentLabel} htmlFor={contentId} error={contentError}>
                <Textarea
                    id={contentId}
                    className="min-h-[110px]"
                    placeholder="Hur var dagen?"
                    value={content}
                    aria-invalid={contentError !== undefined}
                    aria-describedby={contentError ? fieldErrorId(contentId) : undefined}
                    onChange={(e) => setContent(e.target.value)}
                />
            </FormField>
            <FormField label="Datum" htmlFor={dateId} error={dateError}>
                <Input
                    id={dateId}
                    type="date"
                    className="w-auto"
                    value={entryDate}
                    aria-invalid={dateError !== undefined}
                    aria-describedby={dateError ? fieldErrorId(dateId) : undefined}
                    onChange={(e) => setEntryDate(e.target.value)}
                />
            </FormField>
            <div className="space-y-6">
                <button
                    type="button"
                    aria-expanded={showDetails}
                    aria-controls={detailsId}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
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
                <Button type="submit" disabled={isPending}>{isPending ? "Sparar…" : submitLabel}</Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>
                )}
            </FormActions>
        </FormLayout>
    )
}

export default JournalEntryForm
