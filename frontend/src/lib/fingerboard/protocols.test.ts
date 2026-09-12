import { describe, it, expect } from "vitest"
import { PROTOCOL_DEFINITIONS, defaultPreset, handsForMode, totalLoadKg } from "./protocols"

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
    const full = abralifts.presets.find((p) => p.id === "full")!

    it("follows the studied routine: 6 + 6 + 2 + 2 + 2 + 2 across six positions", () => {
        expect(full.blocks.map((b) => b.sets)).toEqual([6, 6, 2, 2, 2, 2])
        expect(full.blocks).toHaveLength(6)
    })

    it("totals the twenty reps the study used", () => {
        const sets = full.blocks.reduce((sum, b) => sum + b.sets, 0)
        expect(sets).toBe(20)
    })

    it("puts the four finger crimp on a 14mm edge, as written", () => {
        expect(full.blocks[0]).toMatchObject({ grip: "half_crimp", edgeMm: 14 })
    })

    it("uses the six positions the study names", () => {
        expect(full.blocks.map((b) => b.grip)).toEqual([
            "half_crimp",
            "front_three",
            "front_two_pocket",
            "middle_two_pocket",
            "front_two_crimp",
            "middle_two_crimp",
        ])
    })

    it("keeps 10s on with the study's short rest", () => {
        expect(abralifts.defaults.workSeconds).toBe(10)
        expect(abralifts.defaults.setRestSeconds).toBe(30)
    })

    it("makes an alternating set exactly one minute", () => {
        const { workSeconds, handSwitchSeconds, setRestSeconds } = abralifts.defaults
        expect(workSeconds * 2 + handSwitchSeconds + setRestSeconds).toBe(60)
    })

    it("lets positions be added and removed, unlike a single-position protocol", () => {
        expect(abralifts.multiBlock).toBe(true)
        expect(PROTOCOL_DEFINITIONS.max_lift.multiBlock).toBe(false)
    })
})

describe("Abralifts volume presets", () => {
    const abralifts = PROTOCOL_DEFINITIONS.abralifts
    const full = abralifts.presets.find((p) => p.id === "full")!
    const half = abralifts.presets.find((p) => p.id === "half")!

    const setsIn = (blocks: { sets: number }[]) => blocks.reduce((sum, b) => sum + b.sets, 0)

    it("offers exactly half the sets in the half variant", () => {
        expect(setsIn(half.blocks)).toBe(setsIn(full.blocks) / 2)
        expect(setsIn(half.blocks)).toBe(10)
    })

    it("halves every position rather than dropping any", () => {
        expect(half.blocks.map((b) => b.grip)).toEqual(full.blocks.map((b) => b.grip))
        expect(half.blocks.map((b) => b.sets)).toEqual(full.blocks.map((b) => b.sets / 2))
    })

    it("starts on the half variant, which is the one that fits the loading window", () => {
        expect(defaultPreset(abralifts).id).toBe("half")
    })

    it("gives single-shape protocols exactly one preset", () => {
        expect(PROTOCOL_DEFINITIONS.max_lift.presets).toHaveLength(1)
        expect(defaultPreset(PROTOCOL_DEFINITIONS.max_lift).id).toBe("standard")
    })
})
