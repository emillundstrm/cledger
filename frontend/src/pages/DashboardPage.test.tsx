import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import DashboardPage from "@/pages/DashboardPage"
import type { Analytics } from "@/api/types"

vi.mock("@/api/analytics", () => ({
    fetchAnalytics: vi.fn(),
}))

import { fetchAnalytics } from "@/api/analytics"

const mockFetchAnalytics = vi.mocked(fetchAnalytics)

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })
}

function renderDashboardPage() {
    const queryClient = createQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/dashboard"]}>
                <DashboardPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

const mockAnalytics: Analytics = {
    sessionsThisWeek: 3,
    hardSessionsLast7Days: 1,
    currentWeekTrainingLoad: 450,
    painFlagsLast30Days: [
        { location: "finger", count: 3, weightedCount: 7 },
        { location: "elbow", count: 1, weightedCount: 1 },
    ],
    sessionTypeVolume: [
        { weekStart: "2026-01-19", type: "boulder", sessionCount: 3, totalMinutes: 240 },
        { weekStart: "2026-01-19", type: "hangboard", sessionCount: 1, totalMinutes: 45 },
        { weekStart: "2026-01-26", type: "boulder", sessionCount: 2, totalMinutes: 150 },
        { weekStart: "2026-01-26", type: "routes", sessionCount: 1, totalMinutes: 90 },
    ],
    sessionPerformanceLog: [
        { date: "2026-01-20", performance: "strong" },
        { date: "2026-01-22", performance: "normal" },
        { date: "2026-01-27", performance: "weak" },
    ],
    weeklyTrainingLoad: [
        { weekStart: "2025-12-08", load: 180 },
        { weekStart: "2025-12-15", load: 360 },
        { weekStart: "2025-12-22", load: 90 },
        { weekStart: "2025-12-29", load: 270 },
        { weekStart: "2026-01-05", load: 540 },
        { weekStart: "2026-01-12", load: 180 },
        { weekStart: "2026-01-19", load: 360 },
        { weekStart: "2026-01-26", load: 450 },
    ],
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe("DashboardPage", () => {
    it("renders the Dashboard heading", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(screen.getByText("Dashboard")).toBeInTheDocument()
    })

    it("shows loading state initially", () => {
        mockFetchAnalytics.mockReturnValue(new Promise(() => {}))
        renderDashboardPage()
        expect(screen.getByText("Loading analytics...")).toBeInTheDocument()
    })

    it("shows error message when fetch fails", async () => {
        mockFetchAnalytics.mockRejectedValue(new Error("Network error"))
        renderDashboardPage()
        expect(
            await screen.findByText("Failed to load analytics.")
        ).toBeInTheDocument()
    })

    it("renders the time span selector defaulting to Past 8 weeks", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(screen.getByLabelText("Time span")).toHaveTextContent("Past 8 weeks")
    })

    it("displays stat cards with correct values", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Sessions This Week")).toBeInTheDocument()
        expect(screen.getByText("Hard Sessions (7 days)")).toBeInTheDocument()
        expect(screen.getByText("Training Load (This Week)")).toBeInTheDocument()

        // Stat values appear in text-4xl divs
        const statValues = screen.getAllByText(/^\d+$/).filter(
            (el) => el.className.includes("text-4xl")
        )
        expect(statValues).toHaveLength(3)
        expect(statValues[0]).toHaveTextContent("3")
        expect(statValues[1]).toHaveTextContent("1")
        expect(statValues[2]).toHaveTextContent("450")
    })

    it("does not display Days Since Rest metric", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Sessions This Week")
        expect(screen.queryByText("Days Since Rest")).not.toBeInTheDocument()
    })

    it("does not display the removed Average RPE chart", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Sessions This Week")
        expect(screen.queryByText(/Average RPE/)).not.toBeInTheDocument()
    })

    it("displays pain flags summary", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Injuries (Last 30 Days)")).toBeInTheDocument()
        expect(screen.getByText("Finger:")).toBeInTheDocument()
        expect(screen.getByText("Elbow:")).toBeInTheDocument()
    })

    it("displays severity-weighted counts when higher than raw count", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Injuries (Last 30 Days)")

        // Finger: count=3, weightedCount=7 → should show weighted
        expect(screen.getByTitle("Severity-weighted count")).toBeInTheDocument()
        expect(screen.getByText("(wt: 7)")).toBeInTheDocument()
    })

    it("does not display weighted count when equal to raw count", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Injuries (Last 30 Days)")

        // Elbow: count=1, weightedCount=1 → no weighted display
        const elbowText = screen.getByText("Elbow:").parentElement!
        expect(elbowText.querySelector("[title='Severity-weighted count']")).toBeNull()
    })

    it("shows no pain flags message when empty", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            painFlagsLast30Days: [],
        })
        renderDashboardPage()
        expect(
            await screen.findByText("No injuries reported.")
        ).toBeInTheDocument()
    })

    it("renders the activity & performance card with a volume metric toggle", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(
            await screen.findByText("Activity & Performance")
        ).toBeInTheDocument()
        // Count/minutes toggle ("Sessions" is exact — distinct from "Sessions This Week")
        expect(screen.getByText("Sessions")).toBeInTheDocument()
        expect(screen.getByText("Minutes")).toBeInTheDocument()
    })

    it("renders the per-session performance ribbon with a weak/normal/strong legend", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Activity & Performance")
        expect(screen.getByText("Performance")).toBeInTheDocument()
        expect(screen.getByText("Weak")).toBeInTheDocument()
        expect(screen.getByText("Normal")).toBeInTheDocument()
        expect(screen.getByText("Strong")).toBeInTheDocument()
    })

    it("shows an empty-ribbon message when there are no sessions in the period", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            sessionPerformanceLog: [],
        })
        renderDashboardPage()
        expect(
            await screen.findByText("No sessions in this period.")
        ).toBeInTheDocument()
    })

    it("renders the training load chart", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Training Load")).toBeInTheDocument()
    })

    it("renders exactly two chart containers (combined + training load)", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Activity & Performance")
        const chartContainers = document.querySelectorAll("[data-slot='chart']")
        expect(chartContainers.length).toBe(2)
    })

    it("shows increasing trend indicator when load increases", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            weeklyTrainingLoad: [
                { weekStart: "2026-01-19", load: 100 },
                { weekStart: "2026-01-26", load: 200 },
            ],
        })
        renderDashboardPage()
        expect(await screen.findByTitle("Load increasing")).toBeInTheDocument()
    })

    it("shows decreasing trend indicator when load decreases", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            weeklyTrainingLoad: [
                { weekStart: "2026-01-19", load: 200 },
                { weekStart: "2026-01-26", load: 100 },
            ],
        })
        renderDashboardPage()
        expect(await screen.findByTitle("Load decreasing")).toBeInTheDocument()
    })

    it("shows stable trend indicator when load is similar", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            weeklyTrainingLoad: [
                { weekStart: "2026-01-19", load: 200 },
                { weekStart: "2026-01-26", load: 210 },
            ],
        })
        renderDashboardPage()
        expect(await screen.findByTitle("Load stable")).toBeInTheDocument()
    })
})
