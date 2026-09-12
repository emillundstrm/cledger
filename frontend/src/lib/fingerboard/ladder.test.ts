import { describe, it, expect } from "vitest"
import {
    applySetChange,
    backOffTarget,
    buildLadder,
    relayerFrom,
    roundToIncrement,
} from "./ladder"
import type { RecordedSet } from "./types"

describe("roundToIncrement", () => {
    it("snaps to the plate step", () => {
        expect(roundToIncrement(33, 2)).toBe(34)
        expect(roundToIncrement(33, 2.5)).toBe(32.5)
    })

    it("leaves the value alone for a nonsensical step", () => {
        expect(roundToIncrement(33, 0)).toBe(33)
    })
})

describe("buildLadder", () => {
    it("ramps in decreasing jumps from the opening weight", () => {
        const ladder = buildLadder(25, 5, 2)

        expect(ladder[0]).toBe(25)
        expect(ladder).toHaveLength(5)

        // Each jump is smaller than the one before it, and never zero.
        const jumps = ladder.slice(1).map((load, i) => load - ladder[i])
        expect(jumps.every((jump) => jump > 0)).toBe(true)
        expect(jumps[0]).toBeGreaterThan(jumps[jumps.length - 1])
    })

    it("keeps every attempt on the plate step", () => {
        for (const load of buildLadder(25, 5, 2).slice(1)) {
            expect(load % 2).toBe(0)
        }
    })

    it("never repeats a weight, even when rounding would collapse the step", () => {
        // A 5kg step with a tiny 3% ramp rounds to nothing without a floor.
        const ladder = buildLadder(100, 6, 5)
        const unique = new Set(ladder)
        expect(unique.size).toBe(ladder.length)
    })

    it("handles a single attempt and none at all", () => {
        expect(buildLadder(25, 1, 2)).toEqual([25])
        expect(buildLadder(25, 0, 2)).toEqual([])
    })
})

describe("relayerFrom", () => {
    it("re-plans everything after an edited attempt, leaving earlier ones alone", () => {
        const ladder = buildLadder(25, 5, 2)
        const edited = [...ladder]
        edited[1] = 30

        const result = relayerFrom(edited, 1, 2)

        expect(result.slice(0, 2)).toEqual([ladder[0], 30])
        expect(result[2]).toBeGreaterThan(30)
    })
})

describe("backOffTarget", () => {
    it("bisects between the best hold and the miss", () => {
        expect(backOffTarget(30, 38, 2)).toBe(34)
    })

    it("steps down from the miss when nothing has been held yet", () => {
        expect(backOffTarget(null, 30, 2)).toBe(28)
    })

    it("stays on the best hold when the gap is already one plate", () => {
        expect(backOffTarget(30, 32, 2)).toBe(30)
    })

    it("never returns a target at or above the failed weight", () => {
        expect(backOffTarget(30, 34, 2)).toBeLessThan(34)
    })
})

function sets(loads: number[], hand: "left" | "right" = "left"): RecordedSet[] {
    return loads.map((loadKg, index) => ({
        setIndex: index + 1,
        blockIndex: 0,
        hand,
        loadKg,
        completed: true,
        rpe: null,
    }))
}

describe("applySetChange", () => {
    it("re-plans later attempts when a load is corrected mid-workout", () => {
        const result = applySetChange(sets([25, 30, 34, 36, 38]), 2, "left", { loadKg: 32 }, 2)

        expect(result[1].loadKg).toBe(32)
        expect(result[2].loadKg).toBeGreaterThan(32)
        expect(result[0].loadKg).toBe(25)
    })

    it("backs off remaining attempts after a miss instead of climbing", () => {
        const recorded = sets([25, 30, 34, 36, 38])
        const result = applySetChange(recorded, 3, "left", { completed: false }, 2)

        // Held 30, missed 34 → the useful next attempt splits the difference.
        expect(result[3].loadKg).toBe(32)
        expect(result[4].loadKg).toBe(32)
    })

    it("leaves attempts already done untouched when backing off", () => {
        const result = applySetChange(sets([25, 30, 34, 36, 38]), 3, "left", { completed: false }, 2)
        expect(result.slice(0, 3).map((s) => s.loadKg)).toEqual([25, 30, 34])
    })

    it("moves one hand without disturbing the other", () => {
        const both = [...sets([25, 30, 34], "left"), ...sets([25, 30, 34], "right")]
        const result = applySetChange(both, 1, "left", { loadKg: 30 }, 2)

        expect(result.filter((s) => s.hand === "right").map((s) => s.loadKg)).toEqual([25, 30, 34])
        expect(result.find((s) => s.hand === "left" && s.setIndex === 1)?.loadKg).toBe(30)
        expect(result.find((s) => s.hand === "left" && s.setIndex === 2)?.loadKg).toBeGreaterThan(30)
    })

    it("records a hold without moving any weight, since the ladder is already set", () => {
        const before = sets([25, 30, 34])
        const result = applySetChange(before, 1, "left", { completed: true }, 2)

        expect(result.map((s) => s.loadKg)).toEqual([25, 30, 34])
        expect(result[0].completed).toBe(true)
    })

    it("leaves loads alone entirely for non-adaptive protocols", () => {
        const result = applySetChange(sets([40, 40, 40]), 1, "left", { loadKg: 45 }, 2, false)
        expect(result.map((s) => s.loadKg)).toEqual([45, 40, 40])
    })
})
