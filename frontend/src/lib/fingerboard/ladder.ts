import type { Hand } from "./protocols"
import type { RecordedSet } from "./types"

/** Smallest plate you can actually add. */
export const DEFAULT_INCREMENT_KG = 1

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

/**
 * Applies a proportional bulk adjustment across grip positions, rounding each
 * to the plate step. Scaling rather than adding a flat amount is what keeps the
 * circuit's intensity relationships intact — a flat +1kg is +8% on a 12kg half
 * crimp but +25% on a 4kg two-finger crimp, the weakest position of the lot.
 * A light position not moving at all is correct, not a failure to apply: +8% of
 * 4kg is 0.3kg, which no plate can express.
 */
export function scaledLoads(
    baseLoads: number[],
    scale: number,
    incrementKg: number = DEFAULT_INCREMENT_KG
): number[] {
    return baseLoads.map((load) => Math.max(0, roundToIncrement(load * scale, incrementKg)))
}

/**
 * Derives every position's load from one anchor position, using the relative
 * ratios between grips. This is what makes "set the half crimp and the rest
 * follow" work without a measured max for each position.
 */
export function loadsFromAnchor(
    ratios: number[],
    anchorLoadKg: number,
    incrementKg: number = DEFAULT_INCREMENT_KG
): number[] {
    const anchorRatio = ratios[0]
    if (anchorRatio === undefined || anchorRatio <= 0) {
        return ratios.map(() => 0)
    }
    return ratios.map((ratio) =>
        Math.max(0, roundToIncrement((anchorLoadKg * ratio) / anchorRatio, incrementKg))
    )
}

/**
 * Settles what load each position starts on.
 *
 * Precedence is: what the user has typed, then what they lifted last time for
 * that position, then a fraction of a measured max — and only positions with
 * none of those fall back to grip ratios. Last time beats any derived figure,
 * because it is the one number that is certainly achievable.
 *
 * An anchor value scales the whole set proportionally, so a single dial moves
 * everything without flattening the differences between positions.
 */
export function resolveLoads(
    ratios: number[],
    known: (number | null)[],
    anchorKg: number | null,
    incrementKg: number = DEFAULT_INCREMENT_KG
): number[] {
    const referenceIndex = known.findIndex((load) => load !== null && load > 0)
    const reference = referenceIndex === -1 ? null : known[referenceIndex]

    const base = known.map((load, index) => {
        if (load !== null) {
            return load
        }
        if (reference === null || (ratios[referenceIndex] ?? 0) <= 0) {
            return 0
        }
        return roundToIncrement((reference * ratios[index]) / ratios[referenceIndex], incrementKg)
    })

    if (anchorKg === null || base.length === 0) {
        return base
    }
    if (base[0] <= 0) {
        // Nothing known anywhere: the anchor drives the circuit by ratio alone.
        return loadsFromAnchor(ratios, anchorKg, incrementKg)
    }
    return scaledLoads(base, anchorKg / base[0], incrementKg)
}

/** The scale that moves `referenceBase` to `targetReference`. */
export function scaleForReference(referenceBase: number, targetReference: number): number {
    if (referenceBase <= 0) {
        return 1
    }
    return targetReference / referenceBase
}

function sequenceFor(sets: RecordedSet[], hand: Hand, blockIndex: number): RecordedSet[] {
    return sets
        .filter((set) => set.hand === hand && set.blockIndex === blockIndex)
        .sort((a, b) => a.setIndex - b.setIndex)
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

    const changed = updated.find((set) => set.setIndex === setIndex && set.hand === hand)
    if (changed === undefined) {
        return updated
    }

    const sequence = sequenceFor(updated, hand, changed.blockIndex)
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
        if (set.hand !== hand || set.blockIndex !== changed.blockIndex) {
            return set
        }
        const load = byKey.get(set.setIndex)
        return load === undefined || set.setIndex <= setIndex ? set : { ...set, loadKg: load }
    })
}
