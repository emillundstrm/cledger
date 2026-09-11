import { useMemo } from "react"
import { ArrowRight, Pause, Play, SkipForward, Volume2, VolumeX, X } from "lucide-react"
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
import { HAND_LABELS, totalLoadKg } from "@/lib/fingerboard/protocols"
import type { Step } from "@/lib/fingerboard/timeline"
import { totalSeconds } from "@/lib/fingerboard/timeline"
import { useWakeLock, useWorkoutTimer } from "@/lib/fingerboard/useWorkoutTimer"
import { cn } from "@/lib/utils"
import type { RecordedSet, WorkoutConfig } from "@/lib/fingerboard/types"

interface WorkoutRunnerProps {
    protocol: ProtocolDefinition
    config: WorkoutConfig
    steps: Step[]
    recordedSets: RecordedSet[]
    onRecordSet: (setIndex: number, hand: Hand, changes: Partial<RecordedSet>) => void
    onFinish: (elapsedSeconds: number) => void
    onAbandon: (elapsedSeconds: number, setsReached: number) => void
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
    const total = useMemo(() => totalSeconds(steps), [steps])
    const timer = useWorkoutTimer(steps, () => onFinish(total))
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

    const recordingSets = useMemo(() => {
        if (!protocol.interactive || step === null || step.kind !== "set_rest") {
            return []
        }
        return recordedSets.filter((set) => set.setIndex === step.setIndex)
    }, [protocol.interactive, step, recordedSets])

    const showHand = config.handMode === "alternate"
    const handLabel = showHand && step?.hand != null ? HAND_LABELS[step.hand] : null

    const currentLoad = step === null ? null : loadFor(step.setIndex, step.hand)
    const nextLoad = nextWork === null ? null : loadFor(nextWork.setIndex, nextWork.hand)
    const nextIsNewLoad = nextLoad !== null && nextLoad !== currentLoad

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
                    {handLabel === null ? "" : ` · ${handLabel}`}
                </p>
                <p className="mt-1 font-display text-[5.5rem] leading-none tabular-nums">
                    {formatRemaining(timer.remaining)}
                </p>
                {step ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                        Set {step.setIndex} of {config.params.sets}
                        {step.repIndex > 0 && config.params.repsPerSet > 1
                            ? ` · Rep ${step.repIndex} of ${config.params.repsPerSet}`
                            : ""}
                    </p>
                ) : null}
                {currentLoad !== null ? (
                    <p className="mt-2 font-display text-3xl tabular-nums">
                        {totalLoadKg(config.mode, config.bodyweightKg, currentLoad)}kg
                    </p>
                ) : null}
            </div>

            {!isWork && nextWork !== null && nextLoad !== null ? (
                <div
                    className={cn(
                        "flex items-center justify-between gap-3 rounded-[14px] border px-5 py-4",
                        nextIsNewLoad ? "border-primary/50 bg-primary/5" : "border-border"
                    )}
                >
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="size-4 shrink-0" />
                        Next: set {nextWork.setIndex}
                        {showHand && nextWork.hand !== null ? ` · ${HAND_LABELS[nextWork.hand]}` : ""}
                        {nextIsNewLoad ? " · change plates" : ""}
                    </span>
                    <span className="font-display text-2xl tabular-nums">
                        {totalLoadKg(config.mode, config.bodyweightKg, nextLoad)}kg
                    </span>
                </div>
            ) : null}

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
                                onClick={() => onAbandon(timer.elapsed, step?.setIndex ?? 1)}
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
