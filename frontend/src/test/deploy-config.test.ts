import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const root = path.resolve(__dirname, "../..")

describe("GitHub Pages deployment configuration", () => {
    it("vite.config.ts sets base to /cledger/", () => {
        const config = fs.readFileSync(path.join(root, "vite.config.ts"), "utf-8")
        expect(config).toContain("base: '/cledger/'")
    })

    it("App.tsx sets BrowserRouter basename to /cledger", () => {
        const app = fs.readFileSync(path.join(root, "src/App.tsx"), "utf-8")
        expect(app).toContain('basename="/cledger"')
    })

    it("build script copies index.html to 404.html for SPA routing", () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"))
        expect(pkg.scripts.build).toContain("cp dist/index.html dist/404.html")
    })

    it("GitHub Actions workflow exists for deployment", () => {
        const workflow = path.join(root, "../.github/workflows/deploy.yml")
        expect(fs.existsSync(workflow)).toBe(true)
    })

    it("GitHub Actions workflow uses VITE_SUPABASE_URL secret", () => {
        const workflow = fs.readFileSync(
            path.join(root, "../.github/workflows/deploy.yml"),
            "utf-8"
        )
        expect(workflow).toContain("VITE_SUPABASE_URL")
        expect(workflow).toContain("VITE_SUPABASE_ANON_KEY")
    })
})
