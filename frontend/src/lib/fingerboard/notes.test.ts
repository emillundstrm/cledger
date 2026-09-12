import { describe, it, expect } from "vitest"
import { buildNotes } from "./notes"
import { PROTOCOL_DEFINITIONS } from "./protocols"
import type { WorkoutConfig } from "./types"

const config: WorkoutConfig = {
    blocks: [{ grip: "half_crimp", edgeMm: 20, sets: 2, loadKg: 8 }],
    handMode: "both",
    mode: "hang",
    incrementKg: 1,
    bodyweightKg: 72,
    params: PROTOCOL_DEFINITIONS.repeaters.defaults,
}

describe("buildNotes", () => {
    it("summarises a clean repeaters session in bodyweight-inclusive load", () => {
        const notes = buildNotes(PROTOCOL_DEFINITIONS.repeaters, config, [
            { setIndex: 1, blockIndex: 0, hand: "both", loadKg: 8, completed: true, rpe: null },
            { setIndex: 2, blockIndex: 0, hand: "both", loadKg: 8, completed: true, rpe: null },
        ])

        expect(notes).toBe("Repeaters — half crimp 20mm; both hands. 2/2 sets completed, top load 80kg.")
    })

    it("reports failed sets rather than hiding them", () => {
        const notes = buildNotes(PROTOCOL_DEFINITIONS.repeaters, config, [
            { setIndex: 1, blockIndex: 0, hand: "both", loadKg: 8, completed: true, rpe: null },
            { setIndex: 2, blockIndex: 0, hand: "both", loadKg: 8, completed: false, rpe: null },
        ])

        expect(notes).toContain("1/2 sets completed")
    })

    it("uses absolute load for pickups, ignoring bodyweight", () => {
        const notes = buildNotes(
            PROTOCOL_DEFINITIONS.max_lift,
            { ...config, mode: "pickup", blocks: [{ grip: "half_crimp", edgeMm: 20, sets: 1, loadKg: 60 }] },
            [{ setIndex: 1, blockIndex: 0, hand: "left", loadKg: 60, completed: true, rpe: null }]
        )

        expect(notes).toContain("top load 60kg")
    })
})

describe("buildNotes hand modes", () => {
    it("names the hand mode when each hand is tested separately", () => {
        const notes = buildNotes(
            PROTOCOL_DEFINITIONS.max_lift,
            { ...config, handMode: "alternate", mode: "pickup", blocks: [{ grip: "half_crimp", edgeMm: 20, sets: 1, loadKg: 55 }] },
            [
                { setIndex: 1, blockIndex: 0, hand: "left", loadKg: 50, completed: true, rpe: null },
                { setIndex: 1, blockIndex: 0, hand: "right", loadKg: 55, completed: true, rpe: null },
            ]
        )

        expect(notes).toContain("each hand")
        expect(notes).toContain("2/2 sets completed")
        expect(notes).toContain("top load 55kg")
    })
})

describe("buildNotes top load", () => {
    it("reports the heaviest weight actually held, not the heaviest attempted", () => {
        // The exact shape that misreported a missed 32.5kg as the top load.
        const notes = buildNotes(
            PROTOCOL_DEFINITIONS.max_lift,
            { ...config, mode: "pickup", handMode: "alternate" },
            [
                { setIndex: 1, blockIndex: 0, hand: "left", loadKg: 30, completed: true, rpe: null },
                { setIndex: 1, blockIndex: 0, hand: "right", loadKg: 30, completed: true, rpe: null },
                { setIndex: 2, blockIndex: 0, hand: "left", loadKg: 32.5, completed: false, rpe: null },
                { setIndex: 2, blockIndex: 0, hand: "right", loadKg: 32.5, completed: false, rpe: null },
            ]
        )

        expect(notes).toContain("top load 30kg")
        expect(notes).not.toContain("32.5")
        expect(notes).toContain("2/4 sets completed")
    })

    it("reports zero rather than a missed weight when nothing was held", () => {
        const notes = buildNotes(PROTOCOL_DEFINITIONS.max_lift, { ...config, mode: "pickup" }, [
            { setIndex: 1, blockIndex: 0, hand: "both", loadKg: 40, completed: false, rpe: null },
        ])

        expect(notes).toContain("top load 0kg")
    })
})
