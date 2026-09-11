import { describe, it, expect } from "vitest"
import { PROTOCOL_DEFINITIONS, totalLoadKg } from "./protocols"

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
    it("makes max lift an absolute pickup, which is what calibration needs", () => {
        expect(PROTOCOL_DEFINITIONS.max_lift.mode).toBe("pickup")
        expect(PROTOCOL_DEFINITIONS.max_lift.interactive).toBe(true)
    })

    it("keeps repeaters at the classic 7 on / 3 off, 6 reps", () => {
        const { workSeconds, repRestSeconds, repsPerSet } = PROTOCOL_DEFINITIONS.repeaters.defaults
        expect([workSeconds, repRestSeconds, repsPerSet]).toEqual([7, 3, 6])
    })
})
