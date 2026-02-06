import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import SessionsPage from "@/pages/SessionsPage"
import type { Session } from "@/api/types"

vi.mock("@/api/sessions", () => ({
    fetchSessions: vi.fn(),
}))

import { fetchSessions } from "@/api/sessions"

const mockFetchSessions = vi.mocked(fetchSessions)

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })
}

function renderSessionsPage() {
    const queryClient = createQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/sessions"]}>
                <SessionsPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

const mockSessions: Session[] = [
    {
        id: "1",
        date: "2026-01-28",
        types: ["boulder", "hangboard"],
        intensity: "hard",
        performance: "strong",
        productivity: "high",
        durationMinutes: 90,
        notes: "Good session",
        maxGrade: "V8",
        venue: "Beta Bloc",
        injuries: [],
        createdAt: "2026-01-28T10:00:00",
        updatedAt: "2026-01-28T10:00:00",
    },
    {
        id: "2",
        date: "2026-01-26",
        types: ["routes"],
        intensity: "moderate",
        performance: "normal",
        productivity: "normal",
        durationMinutes: 120,
        notes: null,
        maxGrade: null,
        venue: null,
        injuries: [{ id: "i1", location: "finger", note: null }],
        createdAt: "2026-01-26T10:00:00",
        updatedAt: "2026-01-26T10:00:00",
    },
    {
        id: "3",
        date: "2026-01-20",
        types: ["strength"],
        intensity: "easy",
        performance: "weak",
        productivity: "low",
        durationMinutes: 60,
        notes: null,
        maxGrade: null,
        venue: null,
        injuries: [],
        createdAt: "2026-01-20T10:00:00",
        updatedAt: "2026-01-20T10:00:00",
    },
]

beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
})

describe("SessionsPage", () => {
    it("renders the Sessions heading", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()
        expect(screen.getByText("Sessions")).toBeInTheDocument()
    })

    it("renders a Log Session button linking to /sessions/new", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()
        const link = screen.getByRole("link", { name: "Log Session" })
        expect(link).toHaveAttribute("href", "/sessions/new")
    })

    it("shows loading state initially", () => {
        mockFetchSessions.mockReturnValue(new Promise(() => {}))
        renderSessionsPage()
        expect(screen.getByText("Loading sessions...")).toBeInTheDocument()
    })

    it("shows empty message when no sessions exist", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()
        expect(
            await screen.findByText(/No sessions yet/)
        ).toBeInTheDocument()
    })

    it("renders sessions grouped by week", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        // Wait for sessions to load - check for session type badges
        expect(await screen.findByText("Boulder")).toBeInTheDocument()
        expect(screen.getByText("Hangboard")).toBeInTheDocument()
        expect(screen.getByText("Routes")).toBeInTheDocument()
        expect(screen.getByText("Strength")).toBeInTheDocument()
    })

    it("shows intensity, performance, and productivity for each session", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        expect(await screen.findByText("Hard")).toBeInTheDocument()
        expect(screen.getByText("Strong")).toBeInTheDocument()
        expect(screen.getByText("High")).toBeInTheDocument()
    })

    it("renders session rows as links to edit page", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        const editLinks = screen.getAllByRole("link").filter((link) =>
            link.getAttribute("href")?.includes("/edit")
        )
        expect(editLinks.length).toBe(3)
        expect(editLinks[0]).toHaveAttribute("href", "/sessions/1/edit")
    })

    it("shows error message when fetch fails", async () => {
        mockFetchSessions.mockRejectedValue(new Error("Network error"))
        renderSessionsPage()
        expect(
            await screen.findByText("Failed to load sessions.")
        ).toBeInTheDocument()
    })

    it("shows venue when present on a session", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        expect(await screen.findByText("@ Beta Bloc")).toBeInTheDocument()
    })

    it("applies color coding to intensity badges", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        const allIntensityBadges = screen.getAllByTitle("Intensity")
        // hard = orange, moderate = secondary (default), easy = amber
        expect(allIntensityBadges[0]).toHaveTextContent("Hard")
        expect(allIntensityBadges[0].className).toContain("orange")
        expect(allIntensityBadges[1]).toHaveTextContent("Moderate")
        expect(allIntensityBadges[1].className).toContain("secondary")
        expect(allIntensityBadges[2]).toHaveTextContent("Easy")
        expect(allIntensityBadges[2].className).toContain("amber")
    })

    it("applies color coding to performance badges", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        const performanceBadges = screen.getAllByTitle("Performance")
        // strong = green, normal = secondary, weak = red
        expect(performanceBadges[0]).toHaveTextContent("Strong")
        expect(performanceBadges[0].className).toContain("green")
        expect(performanceBadges[1]).toHaveTextContent("Normal")
        expect(performanceBadges[1].className).toContain("secondary")
        expect(performanceBadges[2]).toHaveTextContent("Weak")
        expect(performanceBadges[2].className).toContain("red")
    })

    it("applies color coding to productivity badges", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        const productivityBadges = screen.getAllByTitle("Productivity")
        // high = green, normal = secondary, low = red
        expect(productivityBadges[0]).toHaveTextContent("High")
        expect(productivityBadges[0].className).toContain("green")
        expect(productivityBadges[1]).toHaveTextContent("Normal")
        expect(productivityBadges[1].className).toContain("secondary")
        expect(productivityBadges[2]).toHaveTextContent("Low")
        expect(productivityBadges[2].className).toContain("red")
    })

    it("shows week separators for sessions in different weeks", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        // Sessions from Jan 26 and Jan 28 are in the same week (Mon Jan 26 – Sun Feb 1)
        // Session from Jan 20 is in a different week (Mon Jan 19 – Sun Jan 25)
        const headings = screen.getAllByRole("heading", { level: 3 })
        expect(headings.length).toBe(2)
    })
})

describe("SessionsPage - View Toggle", () => {
    it("renders list and calendar view toggle buttons", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()

        expect(screen.getByTitle("List view")).toBeInTheDocument()
        expect(screen.getByTitle("Calendar view")).toBeInTheDocument()
    })

    it("defaults to list view", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        const listButton = screen.getByTitle("List view")
        expect(listButton).toHaveAttribute("aria-pressed", "true")
        const calendarButton = screen.getByTitle("Calendar view")
        expect(calendarButton).toHaveAttribute("aria-pressed", "false")
    })

    it("switches to calendar view when calendar button is clicked", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        await user.click(screen.getByTitle("Calendar view"))

        expect(screen.getByTestId("calendar-view")).toBeInTheDocument()
        // List view elements should not be present
        expect(screen.queryByText("Boulder")).not.toBeInTheDocument()
    })

    it("switches back to list view when list button is clicked", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        // Switch to calendar
        await user.click(screen.getByTitle("Calendar view"))
        expect(screen.getByTestId("calendar-view")).toBeInTheDocument()

        // Switch back to list
        await user.click(screen.getByTitle("List view"))
        expect(screen.queryByTestId("calendar-view")).not.toBeInTheDocument()
        expect(screen.getByText("Boulder")).toBeInTheDocument()
    })

    it("persists view preference to localStorage", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        await user.click(screen.getByTitle("Calendar view"))
        expect(localStorage.getItem("cledger-sessions-view")).toBe("calendar")

        await user.click(screen.getByTitle("List view"))
        expect(localStorage.getItem("cledger-sessions-view")).toBe("list")
    })

    it("restores view preference from localStorage", async () => {
        localStorage.setItem("cledger-sessions-view", "calendar")
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        // Should load directly in calendar view
        expect(await screen.findByTestId("calendar-view")).toBeInTheDocument()
        const calendarButton = screen.getByTitle("Calendar view")
        expect(calendarButton).toHaveAttribute("aria-pressed", "true")
    })
})

describe("SessionsPage - Calendar View", () => {
    it("shows day-of-week headers starting from Monday", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")
        await user.click(screen.getByTitle("Calendar view"))

        expect(screen.getByText("Mon")).toBeInTheDocument()
        expect(screen.getByText("Tue")).toBeInTheDocument()
        expect(screen.getByText("Wed")).toBeInTheDocument()
        expect(screen.getByText("Thu")).toBeInTheDocument()
        expect(screen.getByText("Fri")).toBeInTheDocument()
        expect(screen.getByText("Sat")).toBeInTheDocument()
        expect(screen.getByText("Sun")).toBeInTheDocument()
    })

    it("displays one week per row with 7 day cells", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")
        await user.click(screen.getByTitle("Calendar view"))

        // Jan 26-28 are in one week (Mon Jan 26 - Sun Feb 1)
        // Jan 20 is in another week (Mon Jan 19 - Sun Jan 25)
        // Each week has 7 cells
        const calendarView = screen.getByTestId("calendar-view")
        const grids = calendarView.querySelectorAll(".grid.grid-cols-7.gap-1:not(.text-center)")
        expect(grids.length).toBe(2)
    })

    it("shows session type abbreviations in calendar cells", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")
        await user.click(screen.getByTitle("Calendar view"))

        // Session 1 (Jan 28): boulder -> "B", hangboard -> "H"
        expect(screen.getByText("B")).toBeInTheDocument()
        expect(screen.getByText("H")).toBeInTheDocument()
        // Session 2 (Jan 26): routes -> "R"
        expect(screen.getByText("R")).toBeInTheDocument()
        // Session 3 (Jan 20): strength -> "S"
        expect(screen.getByText("S")).toBeInTheDocument()
    })

    it("shows venue in calendar cells when present", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")
        await user.click(screen.getByTitle("Calendar view"))

        // Session 1 has venue "Beta Bloc"
        expect(screen.getByText("Beta Bloc")).toBeInTheDocument()
    })

    it("renders sessions as links to edit page in calendar view", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")
        await user.click(screen.getByTitle("Calendar view"))

        const editLinks = screen.getAllByRole("link").filter((link) =>
            link.getAttribute("href")?.includes("/edit")
        )
        expect(editLinks.length).toBe(3)
        // Calendar shows weeks newest first; within a week, Mon-Sun left to right
        // Week of Jan 26: Mon Jan 26 (id=2), Wed Jan 28 (id=1)
        expect(editLinks[0]).toHaveAttribute("href", "/sessions/2/edit")
        expect(editLinks[1]).toHaveAttribute("href", "/sessions/1/edit")
    })

    it("does not show intensity/performance/productivity in calendar view", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")
        await user.click(screen.getByTitle("Calendar view"))

        expect(screen.queryByTitle("Intensity")).not.toBeInTheDocument()
        expect(screen.queryByTitle("Performance")).not.toBeInTheDocument()
        expect(screen.queryByTitle("Productivity")).not.toBeInTheDocument()
    })

    it("shows empty cells for days without sessions", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")
        await user.click(screen.getByTitle("Calendar view"))

        // Jan 27 (Tuesday) has no session in week of Jan 26
        const emptyCellTuesday = screen.getByTestId("calendar-cell-2026-01-27")
        // Should only have the day number, no links
        const links = emptyCellTuesday.querySelectorAll("a")
        expect(links.length).toBe(0)
    })

    it("highlights today's cell", async () => {
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue([{
            id: "today-session",
            date: todayStr,
            types: ["boulder"],
            intensity: "moderate",
            performance: "normal",
            productivity: "normal",
            durationMinutes: 60,
            notes: null,
            maxGrade: null,
            venue: null,
            injuries: [],
            createdAt: todayStr + "T10:00:00",
            updatedAt: todayStr + "T10:00:00",
        }])
        renderSessionsPage()

        await screen.findByText("Boulder")

        // Switch to calendar (default is list)
        await user.click(screen.getByTitle("Calendar view"))

        const todayCell = screen.getByTestId(`calendar-cell-${todayStr}`)
        expect(todayCell.className).toContain("border-primary")
        expect(todayCell.className).toContain("bg-primary/10")
    })
})
