import { describe, it, expect } from "vitest"
import { cuesForStep } from "./cues"
import type { Step } from "./timeline"

function step(overrides: Partial<Step>): Step {
    return { kind: "work", seconds: 7, setIndex: 1, repIndex: 1, hand: "both", label: "Pull", ...overrides }
}

describe("cuesForStep", () => {
    it("marks the pull and the release of a work step", () => {
        const cues = cuesForStep(step({ kind: "work", seconds: 7 }))

        expect(cues.map((c) => c.at)).toEqual([0, 7])
        expect(cues[0].frequency).toBeGreaterThan(cues[1].frequency)
    })

    it("counts down the last three seconds of a rest", () => {
        expect(cuesForStep(step({ kind: "rep_rest", seconds: 10 })).map((c) => c.at)).toEqual([7, 8, 9])
    })

    it("does not schedule countdown cues before a short rest begins", () => {
        expect(cuesForStep(step({ kind: "rep_rest", seconds: 2 })).map((c) => c.at)).toEqual([0, 1])
    })

    it("counts down the prepare step so the first pull is never a surprise", () => {
        expect(cuesForStep(step({ kind: "prepare", seconds: 10 }))).toHaveLength(3)
    })

    it("counts down a hand switch, so the next hand is ready to pull", () => {
        expect(cuesForStep(step({ kind: "hand_switch", seconds: 10 })).map((c) => c.at)).toEqual([
            7, 8, 9,
        ])
    })
})
