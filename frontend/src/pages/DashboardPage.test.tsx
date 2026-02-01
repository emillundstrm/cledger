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
    daysSinceLastRestDay: 2,
    painFlagsLast30Days: [
        { location: "finger", count: 3 },
        { location: "elbow", count: 1 },
    ],
    weeklySessionCounts: [
        { weekStart: "2025-12-08", count: 2 },
        { weekStart: "2025-12-15", count: 4 },
        { weekStart: "2025-12-22", count: 1 },
        { weekStart: "2025-12-29", count: 3 },
        { weekStart: "2026-01-05", count: 5 },
        { weekStart: "2026-01-12", count: 2 },
        { weekStart: "2026-01-19", count: 4 },
        { weekStart: "2026-01-26", count: 3 },
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

    it("displays stat cards with correct values", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Sessions This Week")).toBeInTheDocument()
        expect(screen.getByText("Hard Sessions (7 days)")).toBeInTheDocument()
        expect(screen.getByText("Days Since Rest")).toBeInTheDocument()

        // Stat values appear in text-3xl divs
        const statValues = screen.getAllByText(/^\d+$/).filter(
            (el) => el.className.includes("text-3xl")
        )
        expect(statValues).toHaveLength(3)
        expect(statValues[0]).toHaveTextContent("3")
        expect(statValues[1]).toHaveTextContent("1")
        expect(statValues[2]).toHaveTextContent("2")
    })

    it("displays pain flags summary", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Pain Flags (Last 30 Days)")).toBeInTheDocument()
        expect(screen.getByText("Finger:")).toBeInTheDocument()
        expect(screen.getByText("Elbow:")).toBeInTheDocument()
    })

    it("shows no pain flags message when empty", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            painFlagsLast30Days: [],
        })
        renderDashboardPage()
        expect(
            await screen.findByText("No pain flags reported.")
        ).toBeInTheDocument()
    })

    it("displays weekly session counts bar chart", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Weekly Sessions (Last 8 Weeks)")).toBeInTheDocument()
        // Check that week labels are displayed
        expect(screen.getByText("Dec 8")).toBeInTheDocument()
        expect(screen.getByText("Jan 26")).toBeInTheDocument()
        // Check that bar count labels exist (8 weeks of data)
        const barLabels = screen.getAllByText(/^\d+$/).filter(
            (el) => el.className.includes("text-xs")
        )
        expect(barLabels.length).toBe(8)
    })

    it("shows no session data message when weekly counts empty", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            weeklySessionCounts: [],
        })
        renderDashboardPage()
        expect(
            await screen.findByText("No session data yet.")
        ).toBeInTheDocument()
    })
})
