import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import PlanPage from "@/pages/PlanPage"
import type { CurrentPlanWeek, TrainingPlan } from "@/api/types"

vi.mock("@/api/plans", () => ({
    fetchCurrentPlanWeek: vi.fn(),
    fetchTrainingPlan: vi.fn(),
}))

import { fetchCurrentPlanWeek, fetchTrainingPlan } from "@/api/plans"

const plan: TrainingPlan = {
    id: "p",
    title: "Höstblock",
    goal: "Starkare fingrar inför vintern",
    notes: null,
    startDate: "2026-10-12",
    archived: false,
    weeks: [
        { week: 1, startDate: "2026-10-12", phase: "strength", focus: "Maxhäng", targetCount: 2, plannedCount: 3, doneCount: 1 },
        { week: 2, startDate: "2026-10-19", phase: "recovery", focus: null, targetCount: null, plannedCount: 2, doneCount: 0 },
    ],
    sessions: [],
}

const week: CurrentPlanWeek = {
    planId: "p",
    planTitle: "Höstblock",
    week: 1,
    weekCount: 2,
    startDate: "2026-10-12",
    endDate: "2026-10-18",
    phase: "strength",
    focus: "Maxhäng",
    targetCount: 2,
    plannedCount: 3,
    doneCount: 1,
    items: [
        {
            entryId: "moon", planSessionId: "t1", title: "Moonboard", category: "strength",
            description: "Maxförsök på 40°", sessionTypes: ["board"], fingerboardPreset: null,
            note: null, slot: 1, sessionId: "s1", sessionDate: "2026-10-13",
        },
        {
            entryId: "moon", planSessionId: "t1", title: "Moonboard", category: "strength",
            description: "Maxförsök på 40°", sessionTypes: ["board"], fingerboardPreset: null,
            note: "Fler försök", slot: 2, sessionId: null, sessionDate: null,
        },
        {
            entryId: "run", planSessionId: "t2", title: "Löpning", category: "endurance",
            description: null, sessionTypes: ["other"], fingerboardPreset: null,
            note: null, slot: 1, sessionId: null, sessionDate: null,
        },
    ],
}

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/plan"]}>
                <PlanPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchTrainingPlan).mockResolvedValue(plan)
    vi.mocked(fetchCurrentPlanWeek).mockResolvedValue(week)
})

describe("PlanPage", () => {
    it("shows this week's progress against its target", async () => {
        renderPage()
        expect(await screen.findByRole("heading", { name: "Höstblock" })).toBeInTheDocument()
        expect(screen.getByText("av 2 · 3 planerade")).toBeInTheDocument()
        expect(screen.getByText("1 kvar")).toBeInTheDocument()
    })

    it("links open items to a new session with the item picked, and done ones to their session", async () => {
        renderPage()
        const open = await screen.findAllByRole("link", { name: "Logga Moonboard" })
        expect(open[0]).toHaveAttribute("href", "/sessions/new?plan=moon")
        expect(screen.getByRole("link", { name: /^Moonboard, klart/ })).toHaveAttribute("href", "/sessions/s1/edit")
        expect(screen.getByText("Fler försök")).toBeInTheDocument()
    })

    it("lists the plan's weeks with their phases", async () => {
        renderPage()
        const weeks = await screen.findByRole("list", { name: "Planens veckor" })
        expect(weeks).toHaveTextContent("Återhämtning")
        expect(weeks).toHaveTextContent("1 av 2")
    })

    it("says so when there is no active plan", async () => {
        vi.mocked(fetchTrainingPlan).mockResolvedValue(null)
        vi.mocked(fetchCurrentPlanWeek).mockResolvedValue(null)
        renderPage()
        expect(await screen.findByText(/Ingen aktiv träningsplan/)).toBeInTheDocument()
    })
})
