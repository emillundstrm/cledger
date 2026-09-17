import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Navigate, useBlocker, useNavigate, useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router"
import { saveFingerboardWorkout } from "@/api/fingerboard"
import { fetchSessions } from "@/api/sessions"
import type { FingerboardSetRequest, FingerboardWorkoutRequest, SessionTarget } from "@/api/types"
import WorkoutSetup from "@/components/fingerboard/WorkoutSetup"
import WorkoutRunner from "@/components/fingerboard/WorkoutRunner"
import WorkoutSummary from "@/components/fingerboard/WorkoutSummary"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { SummaryResult } from "@/components/fingerboard/WorkoutSummary"
import type { RecordedSet, WorkoutConfig } from "@/lib/fingerboard/types"
import type { Hand, Protocol } from "@/lib/fingerboard/protocols"
import { PROTOCOLS, PROTOCOL_DEFINITIONS, handsForMode, totalLoadKg } from "@/lib/fingerboard/protocols"
import type { WorkKey } from "@/lib/fingerboard/timeline"
import { compileTimeline } from "@/lib/fingerboard/timeline"
import { applySetChange, buildLadder } from "@/lib/fingerboard/ladder"

type Phase = "setup" | "run" | "summary"

function isProtocol(value: string | undefined): value is Protocol {
    return value !== undefined && (PROTOCOLS as readonly string[]).includes(value)
}

function FingerboardWorkoutPage() {
    const { protocol: protocolId } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [phase, setPhase] = useState<Phase>("setup")
    const [config, setConfig] = useState<WorkoutConfig | null>(null)
    const [recordedSets, setRecordedSets] = useState<RecordedSet[]>([])
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [abandoned, setAbandoned] = useState(false)
    // Read by the navigation blocker, which runs outside React's render cycle
    // and would otherwise still see the pre-save value.
    const leavingIsSafeRef = useRef(false)

    // A started workout holds data that exists nowhere else until it is saved,
    // so leaving — including via the back button — needs confirming.
    const blocker = useBlocker(
        useCallback(
            () => !leavingIsSafeRef.current && (phase === "run" || phase === "summary"),
            [phase]
        )
    )

    useEffect(() => {
        if (phase !== "run" && phase !== "summary") {
            return
        }
        const warn = (event: BeforeUnloadEvent) => {
            if (leavingIsSafeRef.current) {
                return
            }
            event.preventDefault()
        }
        window.addEventListener("beforeunload", warn)
        return () => {
            window.removeEventListener("beforeunload", warn)
        }
    }, [phase])

    const steps = useMemo(
        () => (config === null ? [] : compileTimeline(config.params, config.handMode, config.blocks)),
        [config]
    )

    const today = format(new Date(), "yyyy-MM-dd")

    // A second workout on the same day belongs to the session the first one
    // logged, rather than to one of its own.
    const { data: sessions = [] } = useQuery({
        queryKey: ["sessions"],
        queryFn: fetchSessions,
    })
    const todaysSessions = useMemo(
        () => sessions.filter((session) => session.date === today),
        [sessions, today]
    )

    const mutation = useMutation({
        mutationFn: ({ workout, target }: { workout: FingerboardWorkoutRequest; target: SessionTarget }) =>
            saveFingerboardWorkout(workout, target),
        onSuccess: async () => {
            leavingIsSafeRef.current = true
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["sessions"] }),
                queryClient.invalidateQueries({ queryKey: ["analytics"] }),
                queryClient.invalidateQueries({ queryKey: ["fingerboardMaxes"] }),
                queryClient.invalidateQueries({ queryKey: ["fingerboardWorkouts"] }),
            ])
            navigate("/fingerboard")
        },
    })

    // Only a max test re-plans itself; a repeaters set holds one working load.
    const isAdaptive = isProtocol(protocolId) && PROTOCOL_DEFINITIONS[protocolId].interactive

    const handleRecordSet = useCallback(
        (setIndex: number, hand: Hand, changes: Partial<RecordedSet>) => {
            if (config === null) {
                return
            }
            setRecordedSets((prev) =>
                applySetChange(
                    prev,
                    setIndex,
                    hand,
                    changes,
                    config.incrementKg,
                    isAdaptive
                )
            )
        },
        [config, isAdaptive]
    )

    if (!isProtocol(protocolId)) {
        return <Navigate to="/fingerboard" replace />
    }

    const protocol = PROTOCOL_DEFINITIONS[protocolId]

    const handleStart = (started: WorkoutConfig) => {
        setConfig(started)
        const hands = handsForMode(started.handMode)

        // Each position contributes its own sets at its own load. Only a max
        // test ramps within a position; everything else holds one working load.
        const entries: RecordedSet[] = []
        let setIndex = 0
        started.blocks.forEach((block, blockIndex) => {
            const ladder = protocol.interactive
                ? buildLadder(block.loadKg, block.sets, started.incrementKg)
                : Array.from({ length: block.sets }, () => block.loadKg)

            for (const loadKg of ladder) {
                setIndex++
                for (const hand of hands) {
                    entries.push({
                        setIndex,
                        blockIndex,
                        hand,
                        loadKg,
                        completed: true,
                        rpe: null,
                    })
                }
            }
        })
        setRecordedSets(entries)
        setPhase("run")
    }

    // Only what was actually worked gets kept; skipping past a set must not
    // record it as completed.
    const keepPerformed = (performed: WorkKey[]) => {
        const keys = new Set(performed.map((key) => `${key.setIndex}:${key.hand ?? ""}`))
        setRecordedSets((prev) =>
            prev.filter((set) => keys.has(`${set.setIndex}:${set.hand}`))
        )
    }

    const handleFinish = (elapsed: number, performed: WorkKey[]) => {
        setElapsedSeconds(elapsed)
        keepPerformed(performed)
        setPhase("summary")
    }

    const handleAbandon = (elapsed: number, performed: WorkKey[]) => {
        setElapsedSeconds(elapsed)
        keepPerformed(performed)
        setAbandoned(true)
        setPhase("summary")
    }

    const handleSave = (result: SummaryResult) => {
        if (config === null) {
            return
        }

        const sets: FingerboardSetRequest[] = result.sets.map((set, index) => ({
            setIndex: index + 1,
            grip: config.blocks[set.blockIndex].grip,
            edgeMm: config.blocks[set.blockIndex].edgeMm,
            hand: set.hand,
            mode: config.mode,
            addedKg: config.mode === "hang" ? set.loadKg : null,
            liftedKg: config.mode === "pickup" ? set.loadKg : null,
            totalLoadKg: totalLoadKg(config.mode, config.bodyweightKg, set.loadKg),
            workSeconds: config.params.workSeconds,
            completed: set.completed,
            rpe: set.rpe,
        }))

        const workout: FingerboardWorkoutRequest = {
            protocol: protocol.id,
            bodyweightKg: config.bodyweightKg,
            params: config.params,
            durationSeconds: Math.round(elapsedSeconds),
            completed: !abandoned,
            notes: result.notes,
            sets,
        }

        const target: SessionTarget =
            result.attachToSessionId === null
                ? {
                      kind: "new",
                      session: {
                          date: today,
                          types: ["hangboard"],
                          intensity: result.rpe,
                          performance: result.performance,
                          durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
                          notes: result.notes,
                          maxGrade: null,
                          venue: null,
                          injuries: [],
                      },
                  }
                : { kind: "existing", sessionId: result.attachToSessionId }

        mutation.mutate({ workout, target })
    }

    return (
        <div className="mx-auto max-w-2xl space-y-7">
            <div className="flex items-center gap-3">
                <Link
                    to="/fingerboard"
                    viewTransition
                    className="flex size-9 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Back"
                >
                    <ArrowLeft className="size-5" />
                </Link>
                <h1 className="font-display text-2xl tracking-tight">{protocol.name}</h1>
            </div>

            {phase === "setup" ? <WorkoutSetup protocol={protocol} onStart={handleStart} /> : null}

            {phase === "run" && config !== null ? (
                <WorkoutRunner
                    protocol={protocol}
                    config={config}
                    steps={steps}
                    recordedSets={recordedSets}
                    onRecordSet={handleRecordSet}
                    onFinish={handleFinish}
                    onAbandon={handleAbandon}
                    onDiscard={() => {
                        leavingIsSafeRef.current = true
                        navigate("/fingerboard")
                    }}
                />
            ) : null}

            {phase === "summary" && config !== null ? (
                <WorkoutSummary
                    protocol={protocol}
                    config={config}
                    sets={recordedSets}
                    elapsedSeconds={elapsedSeconds}
                    todaysSessions={todaysSessions}
                    onChangeSet={handleRecordSet}
                    onSave={handleSave}
                    onDiscard={() => {
                        leavingIsSafeRef.current = true
                        navigate("/fingerboard")
                    }}
                    isSaving={mutation.isPending}
                />
            ) : null}

            <AlertDialog open={blocker.state === "blocked"}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {phase === "summary"
                                ? "This workout has not been saved yet. Leaving now discards it."
                                : "This workout is still running. Leaving now discards everything done so far."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => blocker.reset?.()}>
                            Stay here
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => blocker.proceed?.()}>
                            Discard and leave
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {mutation.isError ? (
                <p className="text-sm text-destructive">
                    Could not save the workout: {mutation.error.message}
                </p>
            ) : null}
        </div>
    )
}

export default FingerboardWorkoutPage
