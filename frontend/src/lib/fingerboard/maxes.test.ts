import { describe, it, expect } from "vitest"
import type { FingerboardMax } from "@/api/types"
import { asymmetries, isStale } from "./maxes"

function max(overrides: Partial<FingerboardMax>): FingerboardMax {
    return {
        grip: "half_crimp",
        edgeMm: 20,
        hand: "both",
        maxLoadKg: 50,
        testedAt: "2026-09-01T00:00:00Z",
        ...overrides,
    }
}

describe("isStale", () => {
    const now = new Date("2026-09-11T00:00:00Z")

    it("treats a recent test as current", () => {
        expect(isStale("2026-08-20T00:00:00Z", now)).toBe(false)
    })

    it("treats a test older than 90 days as stale", () => {
        expect(isStale("2026-05-01T00:00:00Z", now)).toBe(true)
    })
})

describe("asymmetries", () => {
    it("pairs left and right on the same grip and edge", () => {
        const result = asymmetries([
            max({ hand: "left", maxLoadKg: 45 }),
            max({ hand: "right", maxLoadKg: 50 }),
        ])

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
            leftKg: 45,
            rightKg: 50,
            differencePct: 10,
            strongerHand: "right",
        })
    })

    it("ignores two-handed maxima, which say nothing about asymmetry", () => {
        expect(asymmetries([max({ hand: "both" })])).toEqual([])
    })

    it("ignores a hand with no counterpart", () => {
        expect(asymmetries([max({ hand: "left", maxLoadKg: 45 })])).toEqual([])
    })

    it("does not pair across different edges", () => {
        const result = asymmetries([
            max({ hand: "left", edgeMm: 20 }),
            max({ hand: "right", edgeMm: 10 }),
        ])
        expect(result).toEqual([])
    })

    it("orders the worst asymmetry first", () => {
        const result = asymmetries([
            max({ grip: "open", hand: "left", maxLoadKg: 48 }),
            max({ grip: "open", hand: "right", maxLoadKg: 50 }),
            max({ grip: "half_crimp", hand: "left", maxLoadKg: 30 }),
            max({ grip: "half_crimp", hand: "right", maxLoadKg: 50 }),
        ])

        expect(result.map((r) => r.grip)).toEqual(["half_crimp", "open"])
        expect(result[0].differencePct).toBe(40)
    })
})
