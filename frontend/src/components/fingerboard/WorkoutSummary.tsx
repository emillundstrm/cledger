import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Textarea } from "@/components/ui/textarea"
import LoadStepper from "./LoadStepper"
import { PERFORMANCE_VALUES } from "@/api/types"
import type { Session } from "@/api/types"
import type { Hand, ProtocolDefinition } from "@/lib/fingerboard/protocols"
import { GRIP_LABELS, HAND_LABELS, totalLoadKg } from "@/lib/fingerboard/protocols"
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
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

function sessionLabel(session: Session): string {
    const types = session.types.length === 0 ? "Session" : session.types.map(capitalize).join(", ")
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

    return (
        <div className="space-y-7">
            <div>
                <h2 className="font-display text-2xl tracking-tight">Nice work</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {sets.length === 0
                        ? "No sets were completed, so there is nothing to save."
                        : `${minutes} min · ${sets.filter((set) => set.completed).length} of ${sets.length} sets completed`}
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
                                    {GRIP_LABELS[block.grip]} · {block.edgeMm}mm
                                </h3>
                            ) : null}

                            <div className="space-y-3 rounded-[14px] border border-border p-4">
                                <span className="text-xs text-muted-foreground">Set {setIndex}</span>

                                {entries.map((set) => (
                                    <div key={set.hand} className="space-y-2">
                                        {showHand ? (
                                            <Label className="text-xs">{HAND_LABELS[set.hand]}</Label>
                                        ) : null}
                                        <div className="flex items-center gap-2">
                                            <LoadStepper
                                                ariaLabel={`Set ${setIndex} ${set.hand} load`}
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
                                                    "shrink-0 cursor-pointer rounded-[10px] border px-3 py-3 text-xs font-medium transition-colors",
                                                    set.completed
                                                        ? "border-primary/50 bg-primary/10 text-primary"
                                                        : "border-border text-muted-foreground"
                                                )}
                                            >
                                                {set.completed ? "Held" : "Missed"}
                                            </button>
                                        </div>
                                        {showTotal ? (
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                {totalLoadKg(
                                                    config.mode,
                                                    config.bodyweightKg,
                                                    set.loadKg
                                                )}
                                                kg through the fingers
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {todaysSessions.length > 0 ? (
                <div className="space-y-2.5">
                    <Label>Log to</Label>
                    <div className="space-y-2">
                        {todaysSessions.map((session) => (
                            <button
                                key={session.id}
                                type="button"
                                onClick={() => setAttachToSessionId(session.id)}
                                className={cn(
                                    "w-full cursor-pointer rounded-[10px] border px-4 py-3 text-left text-sm transition-colors",
                                    session.id === attachToSessionId
                                        ? "border-primary/50 bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground"
                                )}
                            >
                                <span className="font-medium">Add to today's session</span>
                                <span className="mt-0.5 block text-xs opacity-80">
                                    {sessionLabel(session)}
                                </span>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setAttachToSessionId(null)}
                            className={cn(
                                "w-full cursor-pointer rounded-[10px] border px-4 py-3 text-left text-sm font-medium transition-colors",
                                attachToSessionId === null
                                    ? "border-primary/50 bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground"
                            )}
                        >
                            Log as a separate session
                        </button>
                    </div>
                    {attached !== null ? (
                        <p className="text-xs text-muted-foreground">
                            Keeps that session's RPE and feeling — this workout adds {minutes} min
                            to it.
                        </p>
                    ) : null}
                </div>
            ) : null}

            {attached === null ? (
                <>
                    <div className="space-y-3">
                        <div className="flex items-baseline justify-between">
                            <Label htmlFor="rpe">Session RPE</Label>
                            <span className="font-display text-xl tabular-nums">{rpe}</span>
                        </div>
                        <Slider
                            id="rpe"
                            min={1}
                            max={10}
                            step={1}
                            value={[rpe]}
                            onValueChange={(value) => setRpe(value[0])}
                        />
                    </div>

                    <div className="space-y-2.5">
                        <Label>Performance</Label>
                        <ToggleGroup
                            type="single"
                            value={performance}
                            onValueChange={(value) => {
                                if (value) {
                                    setPerformance(value)
                                }
                            }}
                            className="flex justify-start gap-2"
                        >
                            {PERFORMANCE_VALUES.map((value) => (
                                <ToggleGroupItem
                                    key={value}
                                    value={value}
                                    className="rounded-[10px] px-4"
                                >
                                    {capitalize(value)}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                </>
            ) : null}

            <div className="space-y-2.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                />
            </div>

            <div className="flex gap-3">
                <Button
                    size="lg"
                    className="flex-1"
                    disabled={isSaving || sets.length === 0}
                    onClick={() => onSave({ sets, rpe, performance, notes, attachToSessionId })}
                >
                    {isSaving
                        ? "Saving…"
                        : attached === null
                          ? "Save session"
                          : "Add to session"}
                </Button>
                <Button variant="outline" size="lg" disabled={isSaving} onClick={onDiscard}>
                    Discard
                </Button>
            </div>
        </div>
    )
}

export default WorkoutSummary
