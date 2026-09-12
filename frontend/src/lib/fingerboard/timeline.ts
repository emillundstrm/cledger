import type { Hand, HandMode, ProtocolParams } from "./protocols"
import { handsForMode } from "./protocols"

export type StepKind = "prepare" | "work" | "rep_rest" | "hand_switch" | "set_rest"

export interface Step {
    kind: StepKind
    seconds: number
    /** 1-based. */
    setIndex: number
    /** 1-based within the set; 0 where reps do not apply. */
    repIndex: number
    /** The hand under load, or being switched to. Null where it does not apply. */
    hand: Hand | null
    /** Which grip position this step belongs to. */
    blockIndex: number
    label: string
}

/**
 * Flattens protocol parameters into an ordered list of timed steps. The
 * execution engine is then just a state machine walking this list, which is
 * what keeps new protocols a config change rather than new UI.
 */
export interface TimelineBlock {
    sets: number
}

/**
 * Flattens protocol parameters into an ordered list of timed steps. Sets come
 * from the blocks, so a workout can move through several grip positions in one
 * session rather than repeating a single one.
 */
export function compileTimeline(
    params: ProtocolParams,
    handMode: HandMode = "both",
    blocks: TimelineBlock[] = [{ sets: 1 }]
): Step[] {
    const steps: Step[] = []
    const hands = handsForMode(handMode)
    const total = blocks.reduce((sum, block) => sum + block.sets, 0)

    if (total === 0) {
        return steps
    }

    if (params.prepareSeconds > 0) {
        steps.push({
            kind: "prepare",
            seconds: params.prepareSeconds,
            setIndex: 1,
            repIndex: 0,
            hand: hands[0],
            blockIndex: 0,
            label: "Get ready",
        })
    }

    let setIndex = 0
    blocks.forEach((block, blockIndex) => {
        for (let inBlock = 0; inBlock < block.sets; inBlock++) {
            setIndex++
            const isLastSet = setIndex === total

            hands.forEach((hand, handPosition) => {
                for (let rep = 1; rep <= params.repsPerSet; rep++) {
                    steps.push({
                        kind: "work",
                        seconds: params.workSeconds,
                        setIndex,
                        repIndex: rep,
                        hand,
                        blockIndex,
                        label: "Pull",
                    })

                    const isLastRep = rep === params.repsPerSet
                    if (!isLastRep && params.repRestSeconds > 0) {
                        steps.push({
                            kind: "rep_rest",
                            seconds: params.repRestSeconds,
                            setIndex,
                            repIndex: rep,
                            hand,
                            blockIndex,
                            label: "Rest",
                        })
                    }
                }

                // Short gap to swap hands; the long rest still comes once per set.
                const isLastHand = handPosition === hands.length - 1
                if (!isLastHand && params.handSwitchSeconds > 0) {
                    steps.push({
                        kind: "hand_switch",
                        seconds: params.handSwitchSeconds,
                        setIndex,
                        repIndex: 0,
                        hand: hands[handPosition + 1],
                        blockIndex,
                        label: "Switch hands",
                    })
                }
            })

            if (!isLastSet && params.setRestSeconds > 0) {
                steps.push({
                    kind: "set_rest",
                    seconds: params.setRestSeconds,
                    setIndex,
                    repIndex: 0,
                    hand: hands[0],
                    blockIndex,
                    label: "Set rest",
                })
            }
        }
    })

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

export interface WorkKey {
    setIndex: number
    hand: Hand | null
}

/**
 * The (set, hand) pairs actually worked: their work step ran to completion and
 * was not skipped. Skipping jumps elapsed time forward, so elapsed time alone
 * would count a skipped set as done — which is how a skipped set used to be
 * saved as completed.
 */
export function performedWork(
    steps: Step[],
    offsets: number[],
    elapsed: number,
    skipped: ReadonlySet<number> = new Set()
): WorkKey[] {
    const seen = new Set<string>()
    const keys: WorkKey[] = []

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        if (step.kind !== "work" || skipped.has(i)) {
            continue
        }
        if (elapsed < offsets[i] + step.seconds) {
            continue
        }
        const key = `${step.setIndex}:${step.hand ?? ""}`
        if (!seen.has(key)) {
            seen.add(key)
            keys.push({ setIndex: step.setIndex, hand: step.hand })
        }
    }

    return keys
}
