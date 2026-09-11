import { describe, it, expect } from "vitest"
import { buildNotes } from "./notes"
import { PROTOCOL_DEFINITIONS } from "./protocols"
import type { WorkoutConfig } from "./types"

const config: WorkoutConfig = {
    grip: "half_crimp",
    hand: "both",
    edgeMm: 20,
    bodyweightKg: 72,
    loadKg: 8,
    params: PROTOCOL_DEFINITIONS.repeaters.defaults,
}

describe("buildNotes", () => {
    it("summarises a clean repeaters session in bodyweight-inclusive load", () => {
        const notes = buildNotes(PROTOCOL_DEFINITIONS.repeaters, config, [
            { setIndex: 1, loadKg: 8, completed: true, rpe: null },
            { setIndex: 2, loadKg: 8, completed: true, rpe: null },
        ])

        expect(notes).toBe("Repeaters — half crimp, 20mm, both hands. 2/2 sets completed, top load 80kg.")
    })

    it("reports failed sets rather than hiding them", () => {
        const notes = buildNotes(PROTOCOL_DEFINITIONS.repeaters, config, [
            { setIndex: 1, loadKg: 8, completed: true, rpe: null },
            { setIndex: 2, loadKg: 8, completed: false, rpe: null },
        ])

        expect(notes).toContain("1/2 sets completed")
    })

    it("uses absolute load for pickups, ignoring bodyweight", () => {
        const notes = buildNotes(
            PROTOCOL_DEFINITIONS.max_lift,
            { ...config, loadKg: 60 },
            [{ setIndex: 1, loadKg: 60, completed: true, rpe: null }]
        )

        expect(notes).toContain("top load 60kg")
    })
})
