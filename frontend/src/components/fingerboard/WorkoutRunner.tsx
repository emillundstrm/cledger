import { useMemo } from "react"
import { Pause, Play, SkipForward, Volume2, VolumeX, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import type { ProtocolDefinition } from "@/lib/fingerboard/protocols"
import { totalLoadKg } from "@/lib/fingerboard/protocols"
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
    onRecordSet: (setIndex: number, changes: Partial<RecordedSet>) => void
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
    const progress = timer.total === 0 ? 0 : Math.min(1, timer.elapsed / timer.total)

    // Interactive protocols (max lift) record the attempt during the rest that
    // follows it, while it is fresh and there is time to spare.
    const recordingSet = useMemo(() => {
        if (!protocol.interactive || step === null || step.kind !== "set_rest") {
            return null
        }
        return recordedSets.find((set) => set.setIndex === step.setIndex) ?? null
    }, [protocol.interactive, step, recordedSets])

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
        <div className="space-y-7">
            <div
                className={cn(
                    "rounded-[18px] border p-8 text-center transition-colors duration-300",
                    isWork
                        ? "border-primary/60 bg-primary/10"
                        : "border-border bg-card/50"
                )}
            >
                <p
                    className={cn(
                        "font-display text-2xl tracking-tight",
                        isWork ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    {step?.label ?? "Done"}
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
                        {" · "}
                        {totalLoadKg(protocol.mode, config.bodyweightKg, config.loadKg)}kg
                    </p>
                ) : null}
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                <div
                    className="h-full bg-primary transition-[width] duration-200"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>

            {recordingSet !== null ? (
                <div className="space-y-4 rounded-[14px] border border-border p-5">
                    <h3 className="font-display text-lg tracking-tight">
                        Record attempt {recordingSet.setIndex}
                    </h3>
                    <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="attempt-load">Weight lifted (kg)</Label>
                            <Input
                                id="attempt-load"
                                type="number"
                                inputMode="decimal"
                                step="0.5"
                                value={recordingSet.loadKg}
                                onChange={(event) =>
                                    onRecordSet(recordingSet.setIndex, {
                                        loadKg: Number(event.target.value),
                                    })
                                }
                            />
                        </div>
                        <Button
                            type="button"
                            variant={recordingSet.completed ? "default" : "outline"}
                            onClick={() =>
                                onRecordSet(recordingSet.setIndex, { completed: true })
                            }
                        >
                            Held
                        </Button>
                        <Button
                            type="button"
                            variant={!recordingSet.completed ? "default" : "outline"}
                            onClick={() =>
                                onRecordSet(recordingSet.setIndex, { completed: false })
                            }
                        >
                            Failed
                        </Button>
                    </div>
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
                            <AlertDialogAction onClick={() => onAbandon(timer.elapsed, step?.setIndex ?? 1)}>
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
