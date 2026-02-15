import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

describe("Dark mode configuration", () => {
    it("index.html has dark class on html element", () => {
        const html = readFileSync(
            resolve(__dirname, "../../index.html"),
            "utf-8"
        )
        expect(html).toContain('class="dark"')
    })

    it("index.css defines dark theme with warm tones", () => {
        const css = readFileSync(
            resolve(__dirname, "../index.css"),
            "utf-8"
        )
        // Verify .dark block exists
        expect(css).toContain(".dark {")
        // Verify background uses a warm hue (around 60)
        expect(css).toMatch(/--background:\s*oklch\([^)]*60/)
        // Verify card uses a warm hue
        expect(css).toMatch(/--card:\s*oklch\([^)]*60/)
        // Verify primary uses a warm amber hue (around 80)
        expect(css).toMatch(/--primary:\s*oklch\([^)]*80/)
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
