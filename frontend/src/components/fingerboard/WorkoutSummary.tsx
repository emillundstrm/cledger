import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RadioGroup } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Container } from "@/components/system/Container"
import { FormActions, FormError, FormField } from "@/components/system/Form"
import { SegmentedControl } from "@/components/system/SegmentedControl"
import LoadStepper from "./LoadStepper"
import OptionCard from "@/components/system/OptionCard"
import { PERFORMANCE_VALUES, performanceLabel, sessionTypeLabel } from "@/api/types"
import type { Session } from "@/api/types"
import type { Hand, ProtocolDefinition } from "@/lib/fingerboard/protocols"
import { GRIP_LABELS, HAND_LABELS, totalLoadKg } from "@/lib/fingerboard/protocols"
import { formatKg, formatMm } from "@/lib/fingerboard/format"
import { buildNotes } from "@/lib/fingerboard/notes"
import type { RecordedSet, WorkoutConfig } from "@/lib/fingerboard/types"
import { cn } from "@/lib/utils"

export interface SummaryResult {
    sets: RecordedSet[]
    rpe: number
    performance: string
    notes: string
    // The session this workout joins, or null to log one of its own.
    attachToSessionId: string | null
}

interface WorkoutSummaryProps {
    protocol: ProtocolDefinition
    config: WorkoutConfig
    sets: RecordedSet[]
    elapsedSeconds: number
    todaysSessions: Session[]
    onChangeSet: (setIndex: number, hand: Hand, changes: Partial<RecordedSet>) => void
    onSave: (result: SummaryResult) => void
    onDiscard: () => void
    isSaving: boolean
    /** Why the last save failed, shown above the buttons. */
    saveError?: string | null
}

// The radio value for "log a session of its own"; session ids are UUIDs.
const NEW_SESSION = "new"

function sessionLabel(session: Session): string {
    const types =
        session.types.length === 0
            ? "Pass"
            : session.types.map(sessionTypeLabel).join(", ")
    const parts = [types]
    if (session.durationMinutes !== null) {
        parts.push(`${session.durationMinutes} min`)
    }
    parts.push(`RPE ${session.intensity}`)
    return parts.join(" · ")
}

function WorkoutSummary({
    protocol,
    config,
    sets,
    elapsedSeconds,
    todaysSessions,
    onChangeSet,
    onSave,
    onDiscard,
    isSaving,
    saveError = null,
}: WorkoutSummaryProps) {
    const [rpe, setRpe] = useState(7)
    const [performance, setPerformance] = useState("normal")
    // Two workouts in one visit to the gym are one session, so an existing
    // session for today is the default — logging a separate one is a tap away.
    const [attachToSessionId, setAttachToSessionId] = useState<string | null>(
        todaysSessions.length === 0 ? null : todaysSessions[0].id
    )
    const attached = todaysSessions.find((session) => session.id === attachToSessionId) ?? null
    const [notes, setNotes] = useState(() => buildNotes(protocol, config, sets))

    const minutes = Math.max(1, Math.round(elapsedSeconds / 60))
    const showHand = config.handMode === "alternate"
    // For a lift the entered weight *is* the load through the fingers, so
    // showing both is noise. Only a hang has a total worth stating separately.
    const showTotal = config.mode === "hang"

    // One card per set, with a row per hand inside it.
    const grouped = useMemo(() => {
        const order: number[] = []
        const bySet = new Map<number, RecordedSet[]>()
        for (const set of sets) {
            if (!bySet.has(set.setIndex)) {
                bySet.set(set.setIndex, [])
                order.push(set.setIndex)
            }
            bySet.get(set.setIndex)!.push(set)
        }
        return order.map((setIndex) => ({ setIndex, entries: bySet.get(setIndex)! }))
    }, [sets])

    // Counted over the cards, not the rows: an alternating set is one set with
    // two hands in it, and counting rows reported twice the volume done.
    const setsDone = grouped.filter(({ entries }) => entries.some((set) => set.completed)).length

    return (
        <div className="space-y-7">
            <div>
                <h2 className="font-display text-xl">Bra jobbat</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {sets.length === 0
                        ? "Inga set klarades, så det finns inget att spara."
                        : `${minutes} min · ${setsDone} av ${grouped.length} set klarade`}
                </p>
            </div>

            <div className="space-y-3">
                {grouped.map(({ setIndex, entries }, position) => {
                    const block = config.blocks[entries[0].blockIndex]
                    const previous = position === 0 ? null : grouped[position - 1]
                    const isNewPosition =
                        previous === null ||
                        previous.entries[0].blockIndex !== entries[0].blockIndex

                    return (
                        <div key={setIndex} className="space-y-2">
                            {isNewPosition ? (
                                <h3 className="pt-2 font-display text-lg tracking-tight">
                                    {GRIP_LABELS[block.grip]} · {formatMm(block.edgeMm)}
                                </h3>
                            ) : null}

                            <Container className="space-y-3">
                                <span className="text-xs text-muted-foreground">Set {setIndex}</span>

                                {entries.map((set) => (
                                    <div key={set.hand} className="space-y-2">
                                        {showHand ? (
                                            <Label className="text-xs">{HAND_LABELS[set.hand]}</Label>
                                        ) : null}
                                        <div className="flex items-center gap-2">
                                            <LoadStepper
                                                ariaLabel={`Set ${setIndex}, ${HAND_LABELS[set.hand].toLowerCase()}, belastning`}
                                                value={set.loadKg}
                                                stepKg={config.incrementKg}
                                                className="min-w-0 flex-1"
                                                onChange={(value) =>
                                                    onChangeSet(setIndex, set.hand, {
                                                        loadKg: value,
                                                    })
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onChangeSet(setIndex, set.hand, {
                                                        completed: !set.completed,
                                                    })
                                                }
                                                className={cn(
                                                    "shrink-0 cursor-pointer rounded-full border px-4 py-3 text-xs font-medium outline-none transition-[color,background-color,border-color,transform] duration-150 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                                    set.completed
                                                        ? "border-good/40 bg-good/15 text-good"
                                                        : "border-border text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground"
                                                )}
                                            >
                                                {set.completed ? "Klarade" : "Missade"}
                                            </button>
                                        </div>
                                        {showTotal ? (
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                {formatKg(
                                                    totalLoadKg(
                                                        config.mode,
                                                        config.bodyweightKg,
                                                        set.loadKg
                                                    )
                                                )}{" "}
                                                genom fingrarna
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </Container>
                        </div>
                    )
                })}
            </div>

            {todaysSessions.length > 0 ? (
                <FormField
                    label="Logga till"
                    hint={
                        attached !== null
                            ? `Passets RPE och känsla behålls – det här träningspasset lägger till ${minutes} min.`
                            : undefined
                    }
                >
                    <RadioGroup
                        aria-label="Logga till"
                        value={attachToSessionId ?? NEW_SESSION}
                        onValueChange={(value) =>
                            setAttachToSessionId(value === NEW_SESSION ? null : value)
                        }
                        className="gap-2"
                    >
                        {todaysSessions.map((session) => (
                            <OptionCard
                                key={session.id}
                                id={`attach-${session.id}`}
                                value={session.id}
                                selected={session.id === attachToSessionId}
                                title="Lägg till i dagens pass"
                                description={sessionLabel(session)}
                            />
                        ))}
                        <OptionCard
                            id="attach-new"
                            value={NEW_SESSION}
                            selected={attachToSessionId === null}
                            title="Logga som ett eget pass"
                        />
                    </RadioGroup>
                </FormField>
            ) : null}

            {attached === null ? (
                <>
                    <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                            <Label htmlFor="rpe">Passets RPE</Label>
                            <span className="font-display text-xl tabular-nums">{rpe}</span>
                        </div>
                        <Slider
                            id="rpe"
                            aria-label="Passets RPE"
                            min={1}
                            max={10}
                            step={1}
                            value={[rpe]}
                            onValueChange={(value) => setRpe(value[0])}
                        />
                    </div>

                    <FormField label="Prestation">
                        <SegmentedControl
                            aria-label="Prestation"
                            value={performance}
                            onChange={setPerformance}
                            options={PERFORMANCE_VALUES.map((value) => ({
                                value,
                                label: performanceLabel(value),
                            }))}
                        />
                    </FormField>
                </>
            ) : null}

            <FormField label="Anteckningar" htmlFor="notes">
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                />
            </FormField>

            <div className="space-y-3">
                {saveError !== null ? <FormError>{saveError}</FormError> : null}
                <FormActions>
                    <Button
                        disabled={isSaving || sets.length === 0}
                        onClick={() => onSave({ sets, rpe, performance, notes, attachToSessionId })}
                    >
                        {isSaving
                            ? "Sparar…"
                            : attached === null
                              ? "Spara passet"
                              : "Lägg till i passet"}
                    </Button>
                    <Button variant="destructive-outline" disabled={isSaving} onClick={onDiscard}>
                        Släng
                    </Button>
                </FormActions>
            </div>
        </div>
    )
}

export default WorkoutSummary
