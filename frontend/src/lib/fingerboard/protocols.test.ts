import { describe, it, expect } from "vitest"
import { PROTOCOL_DEFINITIONS, handsForMode, totalLoadKg } from "./protocols"

describe("totalLoadKg", () => {
    it("adds added weight to bodyweight for a hang", () => {
        expect(totalLoadKg("hang", 72, 8)).toBe(80)
    })

    it("subtracts assistance, expressed as negative added weight", () => {
        expect(totalLoadKg("hang", 72, -30)).toBe(42)
    })

    it("ignores bodyweight for a pickup, which is already absolute", () => {
        expect(totalLoadKg("pickup", 72, 60)).toBe(60)
    })

    it("treats a missing bodyweight as zero rather than producing NaN", () => {
        expect(totalLoadKg("hang", null, 8)).toBe(8)
    })

    it("rounds to one decimal place", () => {
        expect(totalLoadKg("hang", 72.35, 8.01)).toBe(80.4)
    })
})

describe("protocol definitions", () => {
    it("makes max lift an absolute lift, which is what calibration needs", () => {
        expect(PROTOCOL_DEFINITIONS.max_lift.defaultMode).toBe("pickup")
        expect(PROTOCOL_DEFINITIONS.max_lift.interactive).toBe(true)
    })

    it("defaults repeaters to lifts as well", () => {
        expect(PROTOCOL_DEFINITIONS.repeaters.defaultMode).toBe("pickup")
    })

    it("does not re-plan loads for repeaters, which hold one working load", () => {
        expect(PROTOCOL_DEFINITIONS.repeaters.interactive).toBe(false)
    })

    it("keeps repeaters at the classic 7 on / 3 off, 6 reps", () => {
        const { workSeconds, repRestSeconds, repsPerSet } = PROTOCOL_DEFINITIONS.repeaters.defaults
        expect([workSeconds, repRestSeconds, repsPerSet]).toEqual([7, 3, 6])
    })
})

describe("handsForMode", () => {
    it("expands alternate into left then right", () => {
        expect(handsForMode("alternate")).toEqual(["left", "right"])
    })

    it("leaves concrete hands alone", () => {
        expect(handsForMode("both")).toEqual(["both"])
        expect(handsForMode("left")).toEqual(["left"])
        expect(handsForMode("right")).toEqual(["right"])
    })

    it("defaults max lift to testing each hand, since that is the point of a test", () => {
        expect(PROTOCOL_DEFINITIONS.max_lift.defaultHandMode).toBe("alternate")
    })

    it("keeps repeaters two-handed by default", () => {
        expect(PROTOCOL_DEFINITIONS.repeaters.defaultHandMode).toBe("both")
    })
})

describe("Abralifts circuit", () => {
    const abralifts = PROTOCOL_DEFINITIONS.abralifts

    it("follows the published routine: 3 + 3 + 1 + 1 + 1 + 1 across six positions", () => {
        expect(abralifts.defaultBlocks.map((b) => b.sets)).toEqual([3, 3, 1, 1, 1, 1])
        expect(abralifts.defaultBlocks).toHaveLength(6)
    })

    it("totals the ten sets the protocol calls for", () => {
        const sets = abralifts.defaultBlocks.reduce((sum, b) => sum + b.sets, 0)
        expect(sets).toBe(10)
    })

    it("puts the four finger crimp on a 14mm edge, as written", () => {
        expect(abralifts.defaultBlocks[0]).toMatchObject({ grip: "half_crimp", edgeMm: 14 })
    })

    it("uses the two-finger positions the routine names", () => {
        expect(abralifts.defaultBlocks.map((b) => b.grip)).toEqual([
            "half_crimp",
            "three_finger_drag",
            "middle_two_pocket",
            "front_two_pocket",
            "middle_two_crimp",
            "front_two_crimp",
        ])
    })

    it("keeps 10s on, 50s off", () => {
        expect(abralifts.defaults.workSeconds).toBe(10)
        expect(abralifts.defaults.setRestSeconds).toBe(50)
    })

    it("lets positions be added and removed, unlike a single-position protocol", () => {
        expect(abralifts.multiBlock).toBe(true)
        expect(PROTOCOL_DEFINITIONS.max_lift.multiBlock).toBe(false)
    })
})
