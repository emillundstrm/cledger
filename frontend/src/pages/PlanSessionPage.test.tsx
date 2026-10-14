import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import PlanSessionPage from "@/pages/PlanSessionPage"
import type { TrainingPlan } from "@/api/types"

vi.mock("@/api/plans", () => ({
    fetchTrainingPlan: vi.fn(),
    updateTrainingPlan: vi.fn(),
}))

import { fetchTrainingPlan, updateTrainingPlan } from "@/api/plans"

const plan: TrainingPlan = {
    id: "p", title: "Höstblock", goal: null, notes: null, startDate: "2026-10-12", archived: false,
    weeks: [{ week: 1, startDate: "2026-10-12", phase: "strength", focus: null, targetCount: null, plannedCount: 1, doneCount: 0 }],
    sessions: [
        {
            id: "t1", title: "Moonboard", category: "strength", description: "Maxförsök", sessionTypes: ["board"],
            fingerboardPreset: null, sortOrder: 0, archived: false,
            entries: [{ id: "moon", week: 1, count: 1, note: null, doneCount: 0 }],
        },
    ],
}

function renderPage(path: string) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/plan/sessions/new" element={<PlanSessionPage />} />
                    <Route path="/plan/sessions/:id" element={<PlanSessionPage />} />
                    <Route path="/plan" element={<p>Planen</p>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchTrainingPlan).mockResolvedValue(plan)
    vi.mocked(updateTrainingPlan).mockResolvedValue()
})

describe("PlanSessionPage", () => {
    it("adds a new session to the plan", async () => {
        const user = userEvent.setup()
        renderPage("/plan/sessions/new")
        await user.type(await screen.findByLabelText("Namn"), "Intervaller")
        await user.click(screen.getByRole("button", { name: "Uthållighet" }))
        await user.click(screen.getByRole("button", { name: "Löpning" }))
        await user.click(screen.getByRole("button", { name: "Lägg till" }))

        expect(updateTrainingPlan).toHaveBeenCalledWith("p", {
            sessions: [{ title: "Intervaller", category: "endurance", description: null, sessionTypes: ["running"] }],
        })
        expect(await screen.findByText("Planen")).toBeInTheDocument()
    })

    it("asks for a name and a category", async () => {
        const user = userEvent.setup()
        renderPage("/plan/sessions/new")
        await user.click(await screen.findByRole("button", { name: "Lägg till" }))

        expect(updateTrainingPlan).not.toHaveBeenCalled()
        expect(screen.getByText("Ge passet ett namn.")).toBeInTheDocument()
        expect(screen.getByText("Välj en kategori.")).toBeInTheDocument()
    })

    it("edits an existing session in place", async () => {
        const user = userEvent.setup()
        renderPage("/plan/sessions/t1")
        const title = await screen.findByLabelText("Namn")
        expect(title).toHaveValue("Moonboard")
        await user.clear(title)
        await user.type(title, "Kilter")
        await user.click(screen.getByRole("button", { name: "Spara" }))

        expect(updateTrainingPlan).toHaveBeenCalledWith("p", {
            sessions: [{ id: "t1", title: "Kilter", category: "strength", description: "Maxförsök", sessionTypes: ["board"] }],
        })
    })

    it("archives a session", async () => {
        const user = userEvent.setup()
        renderPage("/plan/sessions/t1")
        await user.click(await screen.findByRole("button", { name: "Arkivera" }))
        expect(updateTrainingPlan).toHaveBeenCalledWith("p", { sessions: [{ id: "t1", archived: true }] })
    })
})
