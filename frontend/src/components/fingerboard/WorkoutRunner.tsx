import { useMemo } from "react"
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
import type { Hand, ProtocolDefinition } from "@/lib/fingerboard/protocols"
import { GRIP_LABELS, HAND_LABELS, totalLoadKg } from "@/lib/fingerboard/protocols"
import type { Step, WorkKey } from "@/lib/fingerboard/timeline"
import { performedWork, stepOffsets, totalSeconds } from "@/lib/fingerboard/timeline"
import { useWakeLock, useWorkoutTimer } from "@/lib/fingerboard/useWorkoutTimer"
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

function formatRemaining(seconds: number): string {
    const whole = Math.max(0, Math.ceil(seconds))
    if (whole < 60) {
        return String(whole)
    }
    const minutes = Math.floor(whole / 60)
    return `${minutes}:${String(whole % 60).padStart(2, "0")}`
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

    const step = timer.step
    const isWork = step?.kind === "work"
    const progress = total === 0 ? 0 : Math.min(1, timer.elapsed / total)

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

    const recordingSets = useMemo(() => {
        if (!protocol.interactive || step === null || step.kind !== "set_rest") {
            return []
        }
        return recordedSets.filter((set) => set.setIndex === step.setIndex)
    }, [protocol.interactive, step, recordedSets])

    const showHand = config.handMode === "alternate"

    // During work, describe the set being done. During any rest, describe the
    // one coming up — what you just finished is not information you can act on,
    // and the plates need changing before the countdown ends.
    const target = isWork ? step : nextWork
    const targetBlock = target === null ? null : config.blocks[target.blockIndex]
    const targetLoad = target === null ? null : loadFor(target.setIndex, target.hand)
    const previousLoad =
        previousWork === null ? null : loadFor(previousWork.setIndex, previousWork.hand)
    const needsPlateChange =
        !isWork && targetLoad !== null && previousLoad !== null && targetLoad !== previousLoad

    const handLabel = showHand && target?.hand != null ? HAND_LABELS[target.hand] : null

    if (timer.status === "idle") {
        return (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Tap start, then put the phone down. You will hear three beeps before every pull
                    and a lower tone when to let go.
                </p>
                <Button size="lg" className="w-full max-w-xs" onClick={timer.start}>
                    Start
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <div
                className={cn(
                    "rounded-[18px] border p-8 text-center transition-colors duration-300",
                    isWork ? "border-primary/60 bg-primary/10" : "border-border bg-card/50"
                )}
            >
                <p
                    className={cn(
                        "font-display text-2xl tracking-tight",
                        isWork ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    {step?.label ?? "Done"}
                    {isWork && handLabel !== null ? ` · ${handLabel}` : ""}
                </p>
                <p className="mt-1 font-display text-[5.5rem] leading-none tabular-nums">
                    {formatRemaining(timer.remaining)}
                </p>

                {target !== null && targetBlock !== null ? (
                    <div className="mt-4 border-t border-border/60 pt-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {isWork ? `Set ${target.setIndex} of ${totalSets(config.blocks)}` : "Next"}
                        </p>
                        <p className="mt-1 font-display text-lg tracking-tight">
                            {GRIP_LABELS[targetBlock.grip]} · {targetBlock.edgeMm}mm
                            {!isWork && handLabel !== null ? ` · ${handLabel}` : ""}
                        </p>
                        {target.repIndex > 0 && config.params.repsPerSet > 1 && isWork ? (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Rep {target.repIndex} of {config.params.repsPerSet}
                            </p>
                        ) : null}
                        {targetLoad !== null ? (
                            <p
                                className={cn(
                                    "mt-2 font-display text-3xl tabular-nums",
                                    needsPlateChange ? "text-primary" : ""
                                )}
                            >
                                {totalLoadKg(config.mode, config.bodyweightKg, targetLoad)}kg
                            </p>
                        ) : null}
                        {needsPlateChange ? (
                            <p className="mt-1 text-sm font-medium text-primary">Change plates</p>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                <div
                    className="h-full bg-primary transition-[width] duration-200"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>

            {recordingSets.length > 0 ? (
                <div className="space-y-4 rounded-[14px] border border-border p-5">
                    <h3 className="font-display text-lg tracking-tight">
                        How did set {recordingSets[0].setIndex} go?
                    </h3>
                    {recordingSets.map((recordingSet) => (
                        <div key={recordingSet.hand} className="space-y-2.5">
                            <Label htmlFor={`attempt-load-${recordingSet.hand}`}>
                                {showHand ? HAND_LABELS[recordingSet.hand] : "Weight lifted"}
                            </Label>
                            <div className="flex items-center gap-2.5">
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
                                <Button
                                    type="button"
                                    size="lg"
                                    variant={recordingSet.completed ? "default" : "outline"}
                                    onClick={() =>
                                        onRecordSet(recordingSet.setIndex, recordingSet.hand, {
                                            completed: true,
                                        })
                                    }
                                >
                                    Held
                                </Button>
                                <Button
                                    type="button"
                                    size="lg"
                                    variant={!recordingSet.completed ? "default" : "outline"}
                                    onClick={() =>
                                        onRecordSet(recordingSet.setIndex, recordingSet.hand, {
                                            completed: false,
                                        })
                                    }
                                >
                                    Missed
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            <div className="flex items-center justify-center gap-2.5">
                {timer.status === "running" ? (
                    <Button variant="outline" size="lg" onClick={timer.pause}>
                        <Pause className="size-5" />
                        Pause
                    </Button>
                ) : (
                    <Button size="lg" onClick={timer.resume}>
                        <Play className="size-5" />
                        Resume
                    </Button>
                )}
                <Button variant="outline" size="lg" onClick={timer.skip} title="Skip step">
                    <SkipForward className="size-5" />
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    onClick={timer.toggleMuted}
                    title={timer.muted ? "Unmute cues" : "Mute cues"}
                >
                    {timer.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="lg" title="Abandon workout">
                            <X className="size-5" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Stop this workout?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You can save the sets you have already completed, or discard the
                                whole workout.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Keep going</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={onDiscard}
                                className="bg-transparent text-destructive shadow-none hover:bg-destructive/10"
                            >
                                Discard
                            </AlertDialogAction>
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
                                Save what I did
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}

export default WorkoutRunner
