import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CueScheduler } from "./cues"
import type { Step } from "./timeline"
import { positionAt, stepOffsets, totalSeconds } from "./timeline"

export type TimerStatus = "idle" | "running" | "paused" | "finished"

export interface WorkoutTimer {
    status: TimerStatus
    stepIndex: number
    step: Step | null
    /** Seconds remaining in the current step. */
    remaining: number
    /** Seconds elapsed across the whole timeline. */
    elapsed: number
    total: number
    muted: boolean
    /** Indices of steps the user skipped past rather than completed. */
    getSkipped: () => ReadonlySet<number>
    start: () => void
    pause: () => void
    resume: () => void
    skip: () => void
    toggleMuted: () => void
}

/**
 * Drives a compiled timeline. Position is always recomputed from a
 * performance.now() anchor rather than accumulated per tick, so the timer stays
 * correct through stalls, throttling, and time in the background.
 */
export function useWorkoutTimer(
    steps: Step[],
    onFinish?: (skipped: ReadonlySet<number>) => void
): WorkoutTimer {
    const offsets = useMemo(() => stepOffsets(steps), [steps])
    const total = useMemo(() => totalSeconds(steps), [steps])

    const [status, setStatus] = useState<TimerStatus>("idle")
    const [elapsed, setElapsed] = useState(0)
    const [muted, setMuted] = useState(false)

    // Milliseconds banked from previous running spells, plus the anchor for the
    // current spell. Elapsed is always banked + (now - anchor).
    const bankedRef = useRef(0)
    const anchorRef = useRef(0)
    const cuesRef = useRef<CueScheduler | null>(null)
    const lastCuedStepRef = useRef<number>(-1)
    const skippedRef = useRef<Set<number>>(new Set())
    const onFinishRef = useRef(onFinish)

    useEffect(() => {
        onFinishRef.current = onFinish
    }, [onFinish])

    if (cuesRef.current === null) {
        cuesRef.current = new CueScheduler()
    }

    const readElapsed = useCallback((running: boolean): number => {
        const ms = running ? bankedRef.current + (performance.now() - anchorRef.current) : bankedRef.current
        return ms / 1000
    }, [])

    const position = useMemo(
        () => positionAt(steps, offsets, elapsed),
        [steps, offsets, elapsed]
    )

    // Cue the current step whenever it changes. Scheduling is relative to how
    // far into the step we already are, so resuming mid-step stays in sync.
    useEffect(() => {
        if (status !== "running" || position.finished) {
            return
        }
        if (lastCuedStepRef.current === position.stepIndex) {
            return
        }
        lastCuedStepRef.current = position.stepIndex
        const step = steps[position.stepIndex]
        cuesRef.current?.scheduleStep(step, step.seconds - position.remaining)
    }, [status, position.stepIndex, position.finished, position.remaining, steps])

    useEffect(() => {
        if (status !== "running") {
            return
        }

        let raf = 0
        const loop = () => {
            const next = readElapsed(true)

            if (next >= total) {
                bankedRef.current = total * 1000
                setElapsed(total)
                setStatus("finished")
                onFinishRef.current?.(skippedRef.current)
                return
            }

            setElapsed(next)
            raf = requestAnimationFrame(loop)
        }

        raf = requestAnimationFrame(loop)
        return () => {
            cancelAnimationFrame(raf)
        }
    }, [status, readElapsed, total])

    // Coming back from the background: resync position from the wall clock and
    // re-cue the step we actually landed in, since scheduled cues were lost.
    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState !== "visible" || status !== "running") {
                return
            }
            void cuesRef.current?.resumeIfSuspended()
            lastCuedStepRef.current = -1
            setElapsed(readElapsed(true))
        }
        document.addEventListener("visibilitychange", onVisibility)
        return () => {
            document.removeEventListener("visibilitychange", onVisibility)
        }
    }, [status, readElapsed])

    useEffect(() => {
        const scheduler = cuesRef.current
        return () => {
            scheduler?.dispose()
        }
    }, [])

    const start = useCallback(() => {
        // Unlocking must happen inside the gesture that started the workout.
        void cuesRef.current?.unlock()
        bankedRef.current = 0
        anchorRef.current = performance.now()
        lastCuedStepRef.current = -1
        skippedRef.current = new Set()
        setElapsed(0)
        setStatus("running")
    }, [])

    const pause = useCallback(() => {
        bankedRef.current = bankedRef.current + (performance.now() - anchorRef.current)
        cuesRef.current?.cancelPending()
        lastCuedStepRef.current = -1
        setElapsed(bankedRef.current / 1000)
        setStatus("paused")
    }, [])

    const resume = useCallback(() => {
        anchorRef.current = performance.now()
        lastCuedStepRef.current = -1
        setStatus("running")
    }, [])

    const skip = useCallback(() => {
        const current = positionAt(steps, offsets, readElapsed(status === "running"))
        skippedRef.current.add(current.stepIndex)
        const nextIndex = current.stepIndex + 1
        if (nextIndex >= steps.length) {
            bankedRef.current = total * 1000
            setElapsed(total)
            setStatus("finished")
            onFinishRef.current?.(skippedRef.current)
            return
        }
        bankedRef.current = offsets[nextIndex] * 1000
        anchorRef.current = performance.now()
        lastCuedStepRef.current = -1
        setElapsed(offsets[nextIndex])
    }, [steps, offsets, readElapsed, status, total])

    const getSkipped = useCallback((): ReadonlySet<number> => skippedRef.current, [])

    const toggleMuted = useCallback(() => {
        setMuted((prev) => {
            const next = !prev
            cuesRef.current?.setMuted(next)
            if (!next) {
                lastCuedStepRef.current = -1
            }
            return next
        })
    }, [])

    return {
        status,
        stepIndex: position.stepIndex,
        step: steps.length > 0 && !position.finished ? steps[position.stepIndex] : null,
        remaining: position.remaining,
        elapsed,
        total,
        muted,
        getSkipped,
        start,
        pause,
        resume,
        skip,
        toggleMuted,
    }
}

/** Keeps the screen on while a workout is running (Safari 16.4+, Chrome). */
export function useWakeLock(active: boolean): void {
    useEffect(() => {
        if (!active || !("wakeLock" in navigator)) {
            return
        }

        let sentinel: WakeLockSentinel | null = null
        let cancelled = false

        const acquire = async () => {
            try {
                const lock = await navigator.wakeLock.request("screen")
                if (cancelled) {
                    void lock.release()
                    return
                }
                sentinel = lock
            } catch {
                // Denied or unsupported; the workout still runs.
            }
        }

        // The lock is dropped whenever the page is hidden, so re-acquire on return.
        const onVisibility = () => {
            if (document.visibilityState === "visible" && sentinel === null) {
                void acquire()
            }
        }

        void acquire()
        document.addEventListener("visibilitychange", onVisibility)

        return () => {
            cancelled = true
            document.removeEventListener("visibilitychange", onVisibility)
            if (sentinel !== null) {
                void sentinel.release()
                sentinel = null
            }
        }
    }, [active])
}
