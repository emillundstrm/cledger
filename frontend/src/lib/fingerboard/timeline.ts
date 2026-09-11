import type { ProtocolParams } from "./protocols"

export type StepKind = "prepare" | "work" | "rep_rest" | "set_rest"

export interface Step {
    kind: StepKind
    seconds: number
    /** 1-based. */
    setIndex: number
    /** 1-based within the set; 0 where reps do not apply. */
    repIndex: number
    label: string
}

/**
 * Flattens protocol parameters into an ordered list of timed steps. The
 * execution engine is then just a state machine walking this list, which is
 * what keeps new protocols a config change rather than new UI.
 */
export function compileTimeline(params: ProtocolParams): Step[] {
    const steps: Step[] = []

    if (params.prepareSeconds > 0) {
        steps.push({
            kind: "prepare",
            seconds: params.prepareSeconds,
            setIndex: 1,
            repIndex: 0,
            label: "Get ready",
        })
    }

    for (let set = 1; set <= params.sets; set++) {
        for (let rep = 1; rep <= params.repsPerSet; rep++) {
            steps.push({
                kind: "work",
                seconds: params.workSeconds,
                setIndex: set,
                repIndex: rep,
                label: "Pull",
            })

            const isLastRep = rep === params.repsPerSet
            if (!isLastRep && params.repRestSeconds > 0) {
                steps.push({
                    kind: "rep_rest",
                    seconds: params.repRestSeconds,
                    setIndex: set,
                    repIndex: rep,
                    label: "Rest",
                })
            }
        }

        const isLastSet = set === params.sets
        if (!isLastSet && params.setRestSeconds > 0) {
            steps.push({
                kind: "set_rest",
                seconds: params.setRestSeconds,
                setIndex: set,
                repIndex: 0,
                label: "Set rest",
            })
        }
    }

    return steps
}

export function totalSeconds(steps: Step[]): number {
    return steps.reduce((sum, step) => sum + step.seconds, 0)
}

/** Cumulative start offset, in seconds, for each step. */
export function stepOffsets(steps: Step[]): number[] {
    const offsets: number[] = []
    let running = 0
    for (const step of steps) {
        offsets.push(running)
        running += step.seconds
    }
    return offsets
}

export interface TimelinePosition {
    stepIndex: number
    /** Seconds remaining in the current step. */
    remaining: number
    finished: boolean
}

/**
 * Resolves an elapsed time to a position in the timeline. Position is always
 * derived from elapsed wall-clock time rather than accumulated per tick, so the
 * timer self-corrects after a stall or a spell in the background.
 */
export function positionAt(steps: Step[], offsets: number[], elapsed: number): TimelinePosition {
    const total = offsets.length === 0 ? 0 : offsets[offsets.length - 1] + steps[steps.length - 1].seconds

    if (steps.length === 0 || elapsed >= total) {
        return { stepIndex: steps.length - 1, remaining: 0, finished: true }
    }

    let index = 0
    while (index + 1 < steps.length && elapsed >= offsets[index + 1]) {
        index++
    }

    return {
        stepIndex: index,
        remaining: offsets[index] + steps[index].seconds - elapsed,
        finished: false,
    }
}

/** Number of work reps completed at a given elapsed time — used for partial saves. */
export function completedWorkReps(steps: Step[], offsets: number[], elapsed: number): number {
    let count = 0
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].kind === "work" && elapsed >= offsets[i] + steps[i].seconds) {
            count++
        }
    }
    return count
}
