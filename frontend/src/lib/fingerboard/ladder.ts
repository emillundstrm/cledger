import type { Hand } from "./protocols"
import type { RecordedSet } from "./types"

/** Smallest plate you can actually add. */
export const DEFAULT_INCREMENT_KG = 2

export const INCREMENT_OPTIONS = [1, 1.25, 2, 2.5, 5] as const

/**
 * Decelerating ramp. A long way below your max a big jump costs nothing but a
 * little fatigue; close to it, small steps stop you overshooting and burning an
 * attempt on a weight you were never going to hold.
 */
const RAMP_STEPS = [1.2, 1.1, 1.05, 1.03]

function rampStep(attemptIndex: number): number {
    return RAMP_STEPS[Math.min(attemptIndex - 1, RAMP_STEPS.length - 1)]
}

export function roundToIncrement(kg: number, incrementKg: number): number {
    if (incrementKg <= 0) {
        return kg
    }
    return Math.round(kg / incrementKg) * incrementKg
}

/**
 * Recomputes every attempt after `fromIndex`, continuing the ramp. Rounding can
 * collapse a step to nothing, so each attempt is forced at least one increment
 * above the last — otherwise the ladder would stall at a repeated weight.
 */
export function relayerFrom(
    loads: number[],
    fromIndex: number,
    incrementKg: number = DEFAULT_INCREMENT_KG
): number[] {
    const next = [...loads]
    for (let i = fromIndex + 1; i < next.length; i++) {
        const raw = next[i - 1] * rampStep(i)
        const rounded = roundToIncrement(raw, incrementKg)
        next[i] = rounded > next[i - 1] ? rounded : next[i - 1] + incrementKg
    }
    return next
}

export function buildLadder(
    startKg: number,
    attempts: number,
    incrementKg: number = DEFAULT_INCREMENT_KG
): number[] {
    if (attempts <= 0) {
        return []
    }
    const loads = new Array<number>(attempts).fill(startKg)
    return relayerFrom(loads, 0, incrementKg)
}

/**
 * Where to go after a failure. Once you have failed, ramping further is
 * pointless — the max is bracketed between the heaviest hold and the miss, so
 * the useful next attempt bisects that gap.
 */
export function backOffTarget(
    bestSuccessKg: number | null,
    failedKg: number,
    incrementKg: number = DEFAULT_INCREMENT_KG
): number {
    if (bestSuccessKg === null) {
        return Math.max(incrementKg, roundToIncrement(failedKg - incrementKg, incrementKg))
    }

    const midpoint = roundToIncrement((bestSuccessKg + failedKg) / 2, incrementKg)
    if (midpoint <= bestSuccessKg) {
        // Gap already closed to one increment; nothing meaningful left between.
        return bestSuccessKg
    }
    if (midpoint >= failedKg) {
        return failedKg - incrementKg
    }
    return midpoint
}

function sequenceFor(sets: RecordedSet[], hand: Hand): RecordedSet[] {
    return sets.filter((set) => set.hand === hand).sort((a, b) => a.setIndex - b.setIndex)
}

/**
 * Applies one change to one attempt and re-prescribes the rest of that hand's
 * ladder. Hands progress independently, so a change on the left never moves the
 * right. Loads are prescribed ahead rather than bumped on completion, so the
 * next weight is always known before the set starts.
 */
export function applySetChange(
    sets: RecordedSet[],
    setIndex: number,
    hand: Hand,
    changes: Partial<RecordedSet>,
    incrementKg: number = DEFAULT_INCREMENT_KG,
    adaptive: boolean = true
): RecordedSet[] {
    const updated = sets.map((set) =>
        set.setIndex === setIndex && set.hand === hand ? { ...set, ...changes } : set
    )

    if (!adaptive) {
        return updated
    }

    const sequence = sequenceFor(updated, hand)
    const position = sequence.findIndex((set) => set.setIndex === setIndex)
    if (position === -1) {
        return updated
    }

    let loads = sequence.map((set) => set.loadKg)

    if (changes.completed === false) {
        const bestSuccess = sequence
            .slice(0, position)
            .filter((set) => set.completed)
            .reduce<number | null>((best, set) => Math.max(best ?? 0, set.loadKg), null)
        const target = backOffTarget(bestSuccess, sequence[position].loadKg, incrementKg)
        for (let i = position + 1; i < loads.length; i++) {
            loads[i] = target
        }
    } else if (changes.loadKg !== undefined) {
        loads = relayerFrom(loads, position, incrementKg)
    } else {
        return updated
    }

    const byKey = new Map(sequence.map((set, index) => [set.setIndex, loads[index]]))
    return updated.map((set) => {
        if (set.hand !== hand) {
            return set
        }
        const load = byKey.get(set.setIndex)
        return load === undefined || set.setIndex <= setIndex ? set : { ...set, loadKg: load }
    })
}
