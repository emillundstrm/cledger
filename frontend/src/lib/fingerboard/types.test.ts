import { describe, it, expect } from "vitest"
import { setNumbering, totalSets } from "./types"
import type { RecordedSet } from "./types"

function recorded(setIndex: number, hand: RecordedSet["hand"]): RecordedSet {
    return { setIndex, blockIndex: 0, hand, loadKg: 10, completed: true, rpe: null }
}

describe("setNumbering", () => {
    it("gives both hands of one set the same number", () => {
        // Numbering every row instead is what wrote a 10 set Abralifts half as
        // 20 rows numbered 1..20, which came back as a full circuit next time.
        const sets = [
            recorded(1, "left"),
            recorded(1, "right"),
            recorded(2, "left"),
            recorded(2, "right"),
        ]
        const numbers = setNumbering(sets)
        expect(sets.map((set) => numbers.get(set.setIndex))).toEqual([1, 1, 2, 2])
    })

    it("numbers one-handed sets straight through", () => {
        const numbers = setNumbering([recorded(1, "both"), recorded(2, "both")])
        expect([...numbers.values()]).toEqual([1, 2])
    })

    it("closes the gaps left by skipped sets", () => {
        const numbers = setNumbering([recorded(1, "both"), recorded(4, "both")])
        expect(numbers.get(4)).toBe(2)
    })
})

describe("totalSets", () => {
    it("sums the sets across positions", () => {
        expect(totalSets([{ grip: "open", edgeMm: 16, sets: 3, loadKg: 5 }])).toBe(3)
    })
})
