import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

describe("Theme configuration", () => {
    it("index.html has dark class on html element", () => {
        const html = readFileSync(
            resolve(__dirname, "../../index.html"),
            "utf-8"
        )
        expect(html).toContain('class="dark"')
    })

    it("index.css defines chalk light theme with warm base and ember accent", () => {
        const css = readFileSync(
            resolve(__dirname, "../index.css"),
            "utf-8"
        )
        const lightSection = css.split(":root {")[1]?.split("}")[0] ?? ""
        // Background uses a warm paper hue (around 85)
        expect(lightSection).toMatch(/--background:\s*oklch\([0-9. ]*85\)/)
        // Primary uses an ember hue (around 35)
        expect(lightSection).toMatch(/--primary:\s*oklch\([0-9. ]*35\)/)
    })

    it("index.css defines slate dark theme with cool base", () => {
        const css = readFileSync(
            resolve(__dirname, "../index.css"),
            "utf-8"
        )
        expect(css).toContain(".dark {")
        const darkSection = css.split(".dark {")[1]?.split("}")[0] ?? ""
        // Background and card use a cool slate hue (around 255)
        expect(darkSection).toMatch(/--background:\s*oklch\([0-9. ]*255\)/)
        expect(darkSection).toMatch(/--card:\s*oklch\([0-9. ]*255\)/)
        // Primary uses an ember hue (around 40)
        expect(darkSection).toMatch(/--primary:\s*oklch\([0-9. ]*40\)/)
    })

    it("dark theme background is dark (low lightness)", () => {
        const css = readFileSync(
            resolve(__dirname, "../index.css"),
            "utf-8"
        )
        const darkSection = css.split(".dark {")[1]?.split("}")[0] ?? ""
        const bgMatch = darkSection.match(
            /--background:\s*oklch\(([0-9.]+)/
        )
        expect(bgMatch).not.toBeNull()
        const lightness = parseFloat(bgMatch![1])
        expect(lightness).toBeLessThan(0.25)
    })
})
