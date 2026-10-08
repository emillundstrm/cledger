import { useEffect, useMemo, useRef, useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RadioGroup } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { ListFrame, ListRow } from "@/components/system/List"
import { FormActions, FormError, FormField } from "@/components/system/Form"
import { SegmentedControl } from "@/components/system/SegmentedControl"
import LoadStepper from "./LoadStepper"
import SetOutcome from "./SetOutcome"
import OptionCard from "@/components/system/OptionCard"
import { PERFORMANCE_VALUES, performanceLabel, sessionTypeLabel } from "@/api/types"
import type { FingerboardMax, Session } from "@/api/types"
import type { Hand, ProtocolDefinition } from "@/lib/fingerboard/protocols"
import { GRIP_LABELS, HAND_LABELS, totalLoadKg } from "@/lib/fingerboard/protocols"
import { formatKg, formatMm } from "@/lib/fingerboard/format"
import { buildNotes } from "@/lib/fingerboard/notes"
import type { RecordedSet, WorkoutConfig } from "@/lib/fingerboard/types"

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
    /** Stopped early from the runner rather than run to the end. */
    abandoned?: boolean
    /**
     * Measured maxes from before this workout, to call out a new one. Left out
     * while unknown, so nothing is claimed that can't be checked.
     */
    previousMaxes?: FingerboardMax[]
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
    abandoned = false,
    previousMaxes,
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
    // The written summary follows the sets (an outcome changed below changes
    // its count and top load) until the owner edits it; then it is theirs.
    const [ownNotes, setOwnNotes] = useState<string | null>(null)
    const notes = ownNotes ?? buildNotes(protocol, config, sets)

    // Arriving from the full-screen runner, focus would otherwise be left on
    // nothing; start screen readers and the keyboard at the result.
    const heading = useRef<HTMLHeadingElement>(null)
    useEffect(() => {
        heading.current?.focus()
    }, [])

    const minutes = Math.max(1, Math.round(elapsedSeconds / 60))

    // A max is the heaviest completed lift on a grip, edge and hand
    // (fingerboard_maxes), so only lifts can set one.
    const newMaxes = useMemo(() => {
        if (config.mode !== "pickup" || previousMaxes === undefined) {
            return []
        }
        const best = new Map<string, RecordedSet>()
        for (const set of sets) {
            if (!set.completed) {
                continue
            }
            const block = config.blocks[set.blockIndex]
            const key = `${block.grip}:${block.edgeMm}:${set.hand}`
            const current = best.get(key)
            if (current === undefined || set.loadKg > current.loadKg) {
                best.set(key, set)
            }
        }
        return [...best.values()].flatMap((set) => {
            const block = config.blocks[set.blockIndex]
            const previous = previousMaxes.find(
                (max) => max.grip === block.grip && max.edgeMm === block.edgeMm && max.hand === set.hand
            )
            if (previous !== undefined && set.loadKg <= previous.maxLoadKg) {
                return []
            }
            return [{ set, block, gainKg: previous === undefined ? null : set.loadKg - previous.maxLoadKg }]
        })
    }, [config, sets, previousMaxes])
    const showHand = config.handMode === "alternate"
    // For a lift the entered weight *is* the load through the fingers, so
    // showing both is noise. Only a hang has a total worth stating separately.
    const showTotal = config.mode === "hang"

    // Each set with its row per hand.
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

    // Consecutive sets on the same position, each shown under its grip.
    const positions = useMemo(() => {
        const result: { blockIndex: number; setGroups: typeof grouped }[] = []
        for (const group of grouped) {
            const blockIndex = group.entries[0].blockIndex
            const last = result.at(-1)
            if (last !== undefined && last.blockIndex === blockIndex) {
                last.setGroups.push(group)
            } else {
                result.push({ blockIndex, setGroups: [group] })
            }
        }
        return result
    }, [grouped])

    // Counted over the sets, not the rows: an alternating set is one set with
    // two hands in it, and counting rows reported twice the volume done.
    const setsDone = grouped.filter(({ entries }) => entries.some((set) => set.completed)).length

    // The runner asks how a set went in the rest after it, and the last set has
    // no rest after it. So it is asked here, first, and nothing is claimed about
    // the result (a new max above all) until it is answered.
    const lastGroup = grouped.at(-1) ?? null
    const [lastAnswered, setLastAnswered] = useState(false)
    const askLast = lastGroup !== null && !lastAnswered
    const changeOutcome = (setIndex: number, hand: Hand, completed: boolean) => {
        if (setIndex === lastGroup?.setIndex) {
            setLastAnswered(true)
        }
        onChangeSet(setIndex, hand, { completed })
    }

    return (
        <div className="space-y-7">
            <div>
                {/* The heading says what happened, so the end of a workout leads with
                    its result rather than the same words every time. */}
                <h2 ref={heading} tabIndex={-1} className="font-display text-xl outline-none">
                    {sets.length === 0
                        ? "Inget att spara"
                        : askLast
                          ? abandoned
                              ? "Passet avbröts"
                              : "Passet är klart"
                          : newMaxes.length > 0
                          ? newMaxes.length === 1
                              ? "Nytt max"
                              : "Nya max"
                          : abandoned
                            ? "Passet avbröts"
                            : "Bra jobbat"}
                </h2>
                {!askLast && newMaxes.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                        {newMaxes.map(({ set, block, gainKg }) => (
                            <li key={`${block.grip}:${block.edgeMm}:${set.hand}`} className="font-display text-3xl tabular-nums">
                                {formatKg(set.loadKg)}
                                <span className="ml-2 font-sans text-sm text-muted-foreground">
                                    {GRIP_LABELS[block.grip]} · {formatMm(block.edgeMm)}
                                    {showHand ? ` · ${HAND_LABELS[set.hand].toLowerCase()}` : ""}
                                    {gainKg !== null ? ` · +${formatKg(gainKg)}` : " · första mätningen"}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">
                    {sets.length === 0
                        ? "Inga set gjordes, så det finns inget att spara."
                        : `${minutes} min · ${setsDone} av ${grouped.length} set klarade`}
                </p>
            </div>

            {askLast ? (
                <section aria-labelledby="last-set-question" className="space-y-3">
                    <h3 id="last-set-question" className="font-display text-lg tracking-tight">
                        Hur gick sista setet?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Set {lastGroup.setIndex} ·{" "}
                        {GRIP_LABELS[config.blocks[lastGroup.entries[0].blockIndex].grip]} ·{" "}
                        {formatKg(lastGroup.entries[0].loadKg)}
                    </p>
                    {lastGroup.entries.map((set) => (
                        <div key={set.hand} className="flex flex-wrap items-center gap-3">
                            {showHand ? (
                                <span className="w-28 text-sm font-medium">{HAND_LABELS[set.hand]}</span>
                            ) : null}
                            <SetOutcome
                                aria-label={`Sista setet${showHand ? `, ${HAND_LABELS[set.hand].toLowerCase()}` : ""}, resultat`}
                                completed={set.completed}
                                onChange={(completed) => changeOutcome(set.setIndex, set.hand, completed)}
                            />
                        </div>
                    ))}
                </section>
            ) : null}

            {/* Notes are the field the owner nearly always writes in, so they come
                before the set-by-set detail, not after it. */}
            <FormField
                label="Anteckningar"
                htmlFor="notes"
                hint={ownNotes === null ? "Sammanfattningen följer seten tills du skriver själv." : undefined}
                hintId="notes-hint"
            >
                <Textarea
                    id="notes"
                    value={notes}
                    aria-describedby={ownNotes === null ? "notes-hint" : undefined}
                    onChange={(event) => setOwnNotes(event.target.value)}
                    rows={5}
                />
            </FormField>

            {/* One frame of rows per position (DESIGN.md: Container Model): sets
                are many similar items, not standalone boxes. */}
            <div className="space-y-5">
                {positions.map(({ blockIndex, setGroups }) => {
                    const block = config.blocks[blockIndex]
                    return (
                        <section key={`${blockIndex}-${setGroups[0].setIndex}`} className="space-y-2">
                            <h3 className="font-display text-lg tracking-tight">
                                {GRIP_LABELS[block.grip]} · {formatMm(block.edgeMm)}
                            </h3>
                            <ListFrame aria-label={`Set på ${GRIP_LABELS[block.grip].toLowerCase()} ${formatMm(block.edgeMm)}`}>
                                {setGroups.flatMap(({ setIndex, entries }) =>
                                    entries.map((set) => (
                                        <ListRow key={`${setIndex}-${set.hand}`} interactive={false}>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                                <span className="w-24 shrink-0 text-sm font-medium tabular-nums">
                                                    Set {setIndex}
                                                    {showHand ? ` · ${HAND_LABELS[set.hand]}` : ""}
                                                </span>
                                                <LoadStepper
                                                    ariaLabel={`Set ${setIndex}, ${HAND_LABELS[set.hand].toLowerCase()}, belastning`}
                                                    value={set.loadKg}
                                                    stepKg={config.incrementKg}
                                                    className="min-w-40 flex-1"
                                                    onChange={(value) =>
                                                        onChangeSet(setIndex, set.hand, {
                                                            loadKg: value,
                                                        })
                                                    }
                                                />
                                                <SetOutcome
                                                    aria-label={`Set ${setIndex}${showHand ? `, ${HAND_LABELS[set.hand].toLowerCase()}` : ""}, resultat`}
                                                    completed={set.completed}
                                                    onChange={(completed) =>
                                                        changeOutcome(setIndex, set.hand, completed)
                                                    }
                                                />
                                            </div>
                                            {showTotal ? (
                                                <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                                                    {formatKg(totalLoadKg(config.mode, config.bodyweightKg, set.loadKg))}{" "}
                                                    genom fingrarna
                                                </p>
                                            ) : null}
                                        </ListRow>
                                    ))
                                )}
                            </ListFrame>
                        </section>
                    )
                })}
            </div>

            {todaysSessions.length > 0 ? (
                <FormField
                    label="Logga till"
                    hint={
                        attached !== null
                            ? `Passets RPE och prestation behålls – det här träningspasset lägger till ${minutes} min.`
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
                    {/* Everything from the workout exists only here until saved */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isSaving}>
                                Släng
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Släng passet?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Inget av passet sparas. Det går inte att ångra.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" onClick={onDiscard}>
                                    Släng passet
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </FormActions>
            </div>
        </div>
    )
}

export default WorkoutSummary
