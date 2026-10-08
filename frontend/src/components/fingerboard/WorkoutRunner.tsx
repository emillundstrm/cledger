import { useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { Pause, Play, SkipForward, Volume2, VolumeX, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import LoadStepper from "./LoadStepper"
import SetOutcome from "./SetOutcome"
import type { Hand, Mode, ProtocolDefinition } from "@/lib/fingerboard/protocols"
import { GRIP_LABELS, HAND_LABELS, totalLoadKg } from "@/lib/fingerboard/protocols"
import type { Step, WorkKey } from "@/lib/fingerboard/timeline"
import { performedWork, stepOffsets, totalSeconds } from "@/lib/fingerboard/timeline"
import { useWakeLock, useWorkoutTimer } from "@/lib/fingerboard/useWorkoutTimer"
import { formatKg, formatMm } from "@/lib/fingerboard/format"
import { cn } from "@/lib/utils"
import type { RecordedSet, WorkoutConfig } from "@/lib/fingerboard/types"
import { totalSets } from "@/lib/fingerboard/types"

interface WorkoutRunnerProps {
    protocol: ProtocolDefinition
    config: WorkoutConfig
    steps: Step[]
    recordedSets: RecordedSet[]
    onRecordSet: (setIndex: number, hand: Hand, changes: Partial<RecordedSet>) => void
    onFinish: (elapsedSeconds: number, performed: WorkKey[]) => void
    onAbandon: (elapsedSeconds: number, performed: WorkKey[]) => void
    onDiscard: () => void
}

// Outline buttons on the Ember hang surface: drawn in the surface's own ink,
// including hover and the focus ring, which would vanish in Ember on Ember.
const ON_EMBER =
    "border-current/40 bg-transparent text-current hover:border-current hover:text-current focus-visible:ring-current/60"

function formatRemaining(seconds: number): string {
    const whole = Math.max(0, Math.ceil(seconds))
    if (whole < 60) {
        return String(whole)
    }
    const minutes = Math.floor(whole / 60)
    return `${minutes}:${String(whole % 60).padStart(2, "0")}`
}

/** The timeline calls every work step "Dra"; on the board it is a hang or a lift. */
function phaseLabel(step: Step | null, mode: Mode): string {
    if (step === null) {
        return "Klart"
    }
    if (step.kind === "work") {
        return mode === "hang" ? "Häng" : "Lyft"
    }
    return step.label
}

/**
 * While the workout runs, the page steps aside: the rest of the app goes inert
 * and the theme switcher hides, so the full-screen runner is all there is.
 */
function useImmersive(active: boolean) {
    useEffect(() => {
        if (!active) {
            return
        }
        const root = document.getElementById("root")
        document.documentElement.dataset.immersive = ""
        root?.setAttribute("inert", "")
        return () => {
            delete document.documentElement.dataset.immersive
            root?.removeAttribute("inert")
        }
    }, [active])
}

function WorkoutRunner({
    protocol,
    config,
    steps,
    recordedSets,
    onRecordSet,
    onFinish,
    onAbandon,
    onDiscard,
}: WorkoutRunnerProps) {
    const offsets = useMemo(() => stepOffsets(steps), [steps])
    const total = useMemo(() => totalSeconds(steps), [steps])
    const timer = useWorkoutTimer(steps, (skipped) =>
        onFinish(total, performedWork(steps, offsets, total, skipped))
    )
    useWakeLock(timer.status === "running")
    useImmersive(timer.status !== "idle")

    const step = timer.step
    const isWork = step?.kind === "work"
    const isPaused = timer.status === "paused"
    // The hang itself is the one moment that matters, so it takes the whole
    // screen in Ember; paused falls back to the page, so a stopped clock never
    // looks like a running one (DESIGN.md: Workout Runner).
    const isHanging = isWork && !isPaused
    const progress = total === 0 ? 0 : Math.min(1, timer.elapsed / total)
    const setCount = totalSets(config.blocks)

    const loadFor = (setIndex: number, hand: Hand | null): number | null => {
        const match = recordedSets.find(
            (set) => set.setIndex === setIndex && (hand === null || set.hand === hand)
        )
        return match?.loadKg ?? null
    }

    // What is coming up, so plates can be changed during the rest rather than
    // discovered when the countdown has already started.
    const nextWork = useMemo(() => {
        for (let i = timer.stepIndex + 1; i < steps.length; i++) {
            if (steps[i].kind === "work") {
                return steps[i]
            }
        }
        return null
    }, [steps, timer.stepIndex])

    const previousWork = useMemo(() => {
        for (let i = timer.stepIndex - 1; i >= 0; i--) {
            if (steps[i].kind === "work") {
                return steps[i]
            }
        }
        return null
    }, [steps, timer.stepIndex])

    // Every protocol asks how the set went while resting after it, so the
    // summary starts from what happened instead of assuming every set held.
    const recordingSets = useMemo(() => {
        if (step === null || step.kind !== "set_rest") {
            return []
        }
        return recordedSets.filter((set) => set.setIndex === step.setIndex)
    }, [step, recordedSets])

    const showHand = config.handMode === "alternate"

    // During work, describe the set being done. During any rest, describe the
    // one coming up — what you just finished is not information you can act on,
    // and the plates need changing before the countdown ends.
    const target = isWork ? step : nextWork
    const targetBlock = target === null ? null : config.blocks[target.blockIndex]
    const targetLoad = target === null ? null : loadFor(target.setIndex, target.hand)
    const targetTotal =
        targetLoad === null ? null : formatKg(totalLoadKg(config.mode, config.bodyweightKg, targetLoad))
    const previousLoad =
        previousWork === null ? null : loadFor(previousWork.setIndex, previousWork.hand)
    const needsPlateChange =
        !isWork && targetLoad !== null && previousLoad !== null && targetLoad !== previousLoad

    const handLabel = showHand && target?.hand != null ? HAND_LABELS[target.hand] : null
    const phase = isPaused ? "Pausad" : phaseLabel(step, config.mode)
    const setLine =
        target === null ? null : `${isWork ? "Set" : "Nästa: set"} ${target.setIndex} av ${setCount}`

    if (timer.status === "idle") {
        return (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Tryck på starta och lägg ner telefonen. Skärmen färgas under varje{" "}
                    {config.mode === "hang" ? "häng" : "lyft"}, och du hör tre pip innan det är dags
                    och en lägre ton när du ska släppa.
                </p>
                <Button size="lg" className="w-full max-w-xs" onClick={timer.start}>
                    Starta
                </Button>
            </div>
        )
    }

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${protocol.name} pågår`}
            className={cn(
                "fixed inset-0 z-40 flex flex-col transition-colors duration-300 motion-reduce:transition-none",
                isHanging ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
            )}
        >
            <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{protocol.name}</p>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(isHanging && ON_EMBER)}
                        >
                            <X aria-hidden="true" />
                            Avsluta
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Avsluta passet?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Du kan spara de set du redan har klarat, eller slänga hela
                                passet.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        {/* Discarding is an alternative here, not the confirmation, so it
                            is red text rather than a red fill, and it stands apart on the
                            left: the primary color stays with the safe, likely choice. */}
                        <AlertDialogFooter>
                            <AlertDialogAction
                                variant="destructive"
                                className="sm:mr-auto"
                                onClick={onDiscard}
                            >
                                Släng passet
                            </AlertDialogAction>
                            <AlertDialogCancel>Fortsätt köra</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() =>
                                    onAbandon(
                                        timer.elapsed,
                                        performedWork(
                                            steps,
                                            offsets,
                                            timer.elapsed,
                                            timer.getSkipped()
                                        )
                                    )
                                }
                            >
                                Spara det jag gjort
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <div className="mx-auto w-full max-w-2xl px-4 pt-3 sm:px-6">
                <div
                    role="progressbar"
                    aria-label="Passets förlopp"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                    className="h-1.5 overflow-hidden rounded-full bg-current/15"
                >
                    {/* Scaled rather than sized, and with no CSS transition: the timer
                        rewrites this every animation frame, and a transition would
                        restart each time and never catch up. A long workout advances
                        well under a pixel per second, which only scaleX renders. */}
                    <div
                        className="h-full w-full origin-left bg-current/60 will-change-transform"
                        style={{ transform: `scaleX(${progress})` }}
                    />
                </div>
            </div>

            {/* Read from the floor, two metres away: the phase and the countdown
                carry the screen, then what is on the board and what it weighs. */}
            <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col items-center justify-center-safe overflow-y-auto px-4 py-6 text-center sm:px-6">
                <p className="font-display text-5xl leading-none tracking-tight sm:text-6xl">
                    {phase}
                    {isWork && !isPaused && handLabel !== null ? ` · ${handLabel}` : ""}
                </p>
                <p className="mt-2 font-display text-[clamp(6rem,32vw,11rem)] leading-none tabular-nums">
                    {formatRemaining(timer.remaining)}
                </p>

                {target !== null && targetBlock !== null ? (
                    <div className="mt-6 w-full space-y-1">
                        <p className="text-lg font-semibold tabular-nums">
                            {setLine}
                            {target.repIndex > 0 && config.params.repsPerSet > 1 && isWork
                                ? ` · rep ${target.repIndex} av ${config.params.repsPerSet}`
                                : ""}
                        </p>
                        <p className="font-display text-2xl tracking-tight">
                            {GRIP_LABELS[targetBlock.grip]} · {formatMm(targetBlock.edgeMm)}
                            {!isWork && handLabel !== null ? ` · ${handLabel}` : ""}
                        </p>
                        {targetTotal !== null ? (
                            <p className="pt-1 font-display text-5xl tabular-nums">{targetTotal}</p>
                        ) : null}
                        {needsPlateChange ? (
                            <p className="mt-3 rounded-[14px] border border-warn/40 bg-warn/10 px-4 py-3 text-2xl font-semibold text-warn">
                                Byt vikter
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {recordingSets.length > 0 ? (
                    <div className="mt-8 w-full space-y-4 border-t border-border pt-6 text-left">
                        <h2 className="text-center font-display text-xl tracking-tight">
                            Hur gick set {recordingSets[0].setIndex}?
                        </h2>
                        {recordingSets.map((recordingSet) => {
                            const outcomeLabel = `Set ${recordingSet.setIndex}${showHand ? `, ${HAND_LABELS[recordingSet.hand].toLowerCase()}` : ""}, resultat`
                            return (
                                <div key={recordingSet.hand} className="space-y-2.5">
                                    {protocol.interactive || showHand ? (
                                        <Label htmlFor={`attempt-load-${recordingSet.hand}`}>
                                            {showHand ? HAND_LABELS[recordingSet.hand] : "Lyft vikt"}
                                        </Label>
                                    ) : null}
                                    <div className="flex items-center justify-center gap-2.5">
                                        {/* Only a max test adjusts the load as it goes; a
                                            fixed-load protocol just needs the outcome. */}
                                        {protocol.interactive ? (
                                            <LoadStepper
                                                id={`attempt-load-${recordingSet.hand}`}
                                                value={recordingSet.loadKg}
                                                stepKg={config.incrementKg}
                                                className="flex-1"
                                                onChange={(value) =>
                                                    onRecordSet(recordingSet.setIndex, recordingSet.hand, {
                                                        loadKg: value,
                                                    })
                                                }
                                            />
                                        ) : null}
                                        <SetOutcome
                                            aria-label={outcomeLabel}
                                            completed={recordingSet.completed}
                                            onChange={(completed) =>
                                                onRecordSet(recordingSet.setIndex, recordingSet.hand, {
                                                    completed,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : null}
            </div>

            {/* What the step is, for screen readers. The countdown itself is
                left out: announcing every second would drown everything else. */}
            <p aria-live="polite" className="sr-only">
                {phase}
                {isWork && handLabel !== null ? `, ${handLabel}` : ""}
                {setLine !== null ? `. ${setLine}` : ""}
                {targetTotal !== null ? `, ${targetTotal}` : ""}
                {needsPlateChange ? ". Byt vikter" : ""}
            </p>

            <div className="mx-auto flex w-full max-w-2xl items-center gap-2.5 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
                {timer.status === "running" ? (
                    <Button
                        variant="outline"
                        autoFocus
                        className={cn("h-14 flex-1 text-base", isHanging && ON_EMBER)}
                        onClick={timer.pause}
                    >
                        <Pause className="size-5" />
                        Pausa
                    </Button>
                ) : (
                    <Button autoFocus className="h-14 flex-1 text-base" onClick={timer.resume}>
                        <Play className="size-5" />
                        Fortsätt
                    </Button>
                )}
                <Button
                    variant="outline"
                    className={cn("h-14 px-5", isHanging && ON_EMBER)}
                    onClick={timer.skip}
                >
                    <SkipForward aria-hidden="true" className="size-5" />
                    Hoppa över
                </Button>
                <Button
                    variant="outline"
                    className={cn("size-14", isHanging && ON_EMBER)}
                    onClick={timer.toggleMuted}
                    title="Ljudsignaler av"
                    aria-label="Ljudsignaler av"
                    aria-pressed={timer.muted}
                >
                    {timer.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </Button>
            </div>
        </div>,
        document.body
    )
}

export default WorkoutRunner
