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

    it("index.css defines dark theme with blue-gray tones", () => {
        const css = readFileSync(
            resolve(__dirname, "../index.css"),
            "utf-8"
        )
        // Verify .dark block exists
        expect(css).toContain(".dark {")
        // Verify background uses a blue hue (around 260)
        expect(css).toMatch(/--background:\s*oklch\([^)]*260/)
        // Verify card uses a blue hue
        expect(css).toMatch(/--card:\s*oklch\([^)]*260/)
        // Verify primary uses a blue hue
        expect(css).toMatch(/--primary:\s*oklch\([^)]*250/)
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
