import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
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
        intensity: 9,
        performance: "strong",
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
        intensity: 5,
        performance: "normal",
        durationMinutes: 120,
        notes: null,
        maxGrade: null,
        venue: null,
        injuries: [{ id: "i1", location: "finger", note: null, severity: 3 }],
        createdAt: "2026-01-26T10:00:00",
        updatedAt: "2026-01-26T10:00:00",
    },
    {
        id: "3",
        date: "2026-01-20",
        types: ["strength"],
        intensity: 3,
        performance: "weak",
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
    it("renders the Pass heading", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()
        expect(screen.getByRole("heading", { level: 1, name: "Pass" })).toBeInTheDocument()
    })

    it("renders a Logga pass button linking to /sessions/new", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()
        const link = screen.getByRole("link", { name: "Logga pass" })
        expect(link).toHaveAttribute("href", "/sessions/new")
    })

    it("shows loading state initially", () => {
        mockFetchSessions.mockReturnValue(new Promise(() => {}))
        renderSessionsPage()
        expect(screen.getByText("Laddar pass…")).toBeInTheDocument()
    })

    it("shows empty message when no sessions exist", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()
        expect(
            await screen.findByText(/Inga pass än/)
        ).toBeInTheDocument()
    })

    it("renders sessions grouped by week", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        // Wait for sessions to load - check for session type badges
        expect(await screen.findByText("Boulder")).toBeInTheDocument()
        expect(screen.getByText("Fingerträning")).toBeInTheDocument()
        expect(screen.getByText("Leder")).toBeInTheDocument()
        expect(screen.getByText("Styrka")).toBeInTheDocument()
    })

    it("shows intensity and performance for each session", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        expect(await screen.findByText("RPE 9")).toBeInTheDocument()
        expect(screen.getByText("Stark")).toBeInTheDocument()
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
            await screen.findByText("Kunde inte ladda pass.")
        ).toBeInTheDocument()
    })

    it("retries loading when Försök igen is clicked", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockRejectedValueOnce(new Error("Network error"))
        mockFetchSessions.mockResolvedValueOnce(mockSessions)
        renderSessionsPage()

        await user.click(await screen.findByRole("button", { name: "Försök igen" }))

        expect(await screen.findByText("Boulder")).toBeInTheDocument()
        expect(mockFetchSessions).toHaveBeenCalledTimes(2)
    })

    it("shows the session count in each week header", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        expect(screen.getByText("2 pass")).toBeInTheDocument()
        expect(screen.getByText("1 pass")).toBeInTheDocument()
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

        const allIntensityBadges = screen.getAllByTitle("Intensitet")
        // RPE 9 (>= 8) = orange, RPE 5 (5-7) = secondary, RPE 3 (<= 4) = blue
        expect(allIntensityBadges[0]).toHaveTextContent("RPE 9")
        expect(allIntensityBadges[0].className).toContain("orange")
        expect(allIntensityBadges[1]).toHaveTextContent("RPE 5")
        expect(allIntensityBadges[1].className).toContain("secondary")
        expect(allIntensityBadges[2]).toHaveTextContent("RPE 3")
        expect(allIntensityBadges[2].className).toContain("blue")
    })

    it("applies color coding to performance badges", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        const performanceBadges = screen.getAllByTitle("Prestation")
        // strong = green, normal = secondary, weak = red
        expect(performanceBadges[0]).toHaveTextContent("Stark")
        expect(performanceBadges[0].className).toContain("green")
        expect(performanceBadges[1]).toHaveTextContent("Normal")
        expect(performanceBadges[1].className).toContain("secondary")
        expect(performanceBadges[2]).toHaveTextContent("Svag")
        expect(performanceBadges[2].className).toContain("red")
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

    it("displays injury severity with color coding", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        // Session 2 has injury with severity 3, shown with the severity pill
        const injuryBadge = screen.getByText("Finger").closest("span, div")!
        expect(injuryBadge.className).toContain("pill-sev-3")
        // Should show severity number
        expect(screen.getByText("(3)")).toBeInTheDocument()
    })

    it("shows severity tooltip on injury badges", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        expect(screen.getByTitle("Allvarlighetsgrad: Måttlig")).toBeInTheDocument()
    })
})

describe("SessionsPage - View Toggle", () => {
    it("renders list and calendar view toggle buttons", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()

        expect(screen.getByTitle("Visa som lista")).toBeInTheDocument()
        expect(screen.getByTitle("Visa som kalender")).toBeInTheDocument()
    })

    it("defaults to list view", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        const listTab = screen.getByTitle("Visa som lista")
        expect(listTab).toHaveAttribute("aria-checked", "true")
        const calendarTab = screen.getByTitle("Visa som kalender")
        expect(calendarTab).toHaveAttribute("aria-checked", "false")
    })

    it("switches to calendar view when calendar button is clicked", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        await user.click(screen.getByTitle("Visa som kalender"))

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
        await user.click(screen.getByTitle("Visa som kalender"))
        expect(screen.getByTestId("calendar-view")).toBeInTheDocument()

        // Switch back to list
        await user.click(screen.getByTitle("Visa som lista"))
        expect(screen.queryByTestId("calendar-view")).not.toBeInTheDocument()
        expect(screen.getByText("Boulder")).toBeInTheDocument()
    })

    it("is a radio group whose arrow keys move between the views", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        expect(screen.getByRole("radiogroup", { name: "Visning av pass" })).toBeInTheDocument()
        const listRadio = screen.getByRole("radio", { name: "Lista" })
        listRadio.focus()
        await user.keyboard("{ArrowRight}")

        expect(screen.getByRole("radio", { name: "Kalender" })).toHaveAttribute("aria-checked", "true")
        expect(screen.getByRole("radio", { name: "Kalender" })).toHaveFocus()
        expect(screen.getByTestId("calendar-view")).toBeInTheDocument()
    })

    it("persists view preference to localStorage", async () => {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        await user.click(screen.getByTitle("Visa som kalender"))
        expect(localStorage.getItem("cledger-sessions-view")).toBe("calendar")

        await user.click(screen.getByTitle("Visa som lista"))
        expect(localStorage.getItem("cledger-sessions-view")).toBe("list")
    })

    it("restores view preference from localStorage", async () => {
        localStorage.setItem("cledger-sessions-view", "calendar")
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        // Should load directly in calendar view
        expect(await screen.findByTestId("calendar-view")).toBeInTheDocument()
        const calendarTab = screen.getByTitle("Visa som kalender")
        expect(calendarTab).toHaveAttribute("aria-checked", "true")
    })
})

describe("SessionsPage - Calendar View", () => {
    // Pin today to Thu 29 Jan 2026, so the fixtures fall in the current month.
    // Only Date is faked; timers stay real for user-event.
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(new Date(2026, 0, 29, 12))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    async function openCalendar(sessions: Session[] = mockSessions) {
        const user = userEvent.setup()
        mockFetchSessions.mockResolvedValue(sessions)
        renderSessionsPage()
        await screen.findByText("Pass", { selector: "h1" })
        await user.click(await screen.findByTitle("Visa som kalender"))
        return user
    }

    it("shows the current month, with its session count", async () => {
        await openCalendar()
        expect(screen.getByRole("heading", { level: 2, name: "Januari 2026" })).toBeInTheDocument()
        expect(screen.getByText("3 pass")).toBeInTheDocument()
    })

    it("lays the month out as weeks of Monday to Sunday, with week numbers", async () => {
        await openCalendar()

        const headers = screen.getAllByRole("columnheader").map((h) => h.textContent)
        expect(headers).toEqual(["Veckav.", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"])

        // January 2026 starts on a Thursday: five weeks, Mon 29 Dec to Sun 1 Feb
        const weeks = screen.getAllByTestId("calendar-week")
        expect(weeks).toHaveLength(5)
        for (const week of weeks) {
            expect(week.querySelectorAll("[data-testid^='calendar-cell-']")).toHaveLength(7)
        }
        expect(weeks[0]).toContainElement(screen.getByTestId("calendar-cell-2025-12-29"))
        expect(weeks[4]).toContainElement(screen.getByTestId("calendar-cell-2026-02-01"))
        // ISO weeks: 29 Dec 2025 starts week 1 of 2026
        expect(weeks[0].querySelector("th")).toHaveTextContent("Vecka 1")
        expect(weeks[4].querySelector("th")).toHaveTextContent("Vecka 5")
    })

    it("runs from past to future: earlier sessions come first", async () => {
        await openCalendar()

        const links = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.includes("/edit"))
        expect(links.map((l) => l.getAttribute("href"))).toEqual([
            "/sessions/3/edit",
            "/sessions/2/edit",
            "/sessions/1/edit",
        ])
    })

    it("names each type of a session, with its venue", async () => {
        await openCalendar()

        const cell = screen.getByTestId("calendar-cell-2026-01-28")
        expect(within(cell).getByRole("link", { name: "Boulder, Fingerträning @ Beta Bloc, RPE 9" })).toBeInTheDocument()
        expect(cell).toHaveTextContent("Boulder · Fingerträning")
        expect(cell).toHaveTextContent("Beta Bloc")
    })

    it("does not show intensity or performance pills", async () => {
        await openCalendar()
        expect(screen.queryByTitle("Intensitet")).not.toBeInTheDocument()
        expect(screen.queryByTitle("Prestation")).not.toBeInTheDocument()
    })

    it("leaves days without sessions empty", async () => {
        await openCalendar()
        expect(screen.getByTestId("calendar-cell-2026-01-27").querySelectorAll("a")).toHaveLength(0)
    })

    it("moves between months, and back to today", async () => {
        const user = await openCalendar()
        expect(screen.getByRole("button", { name: "Idag" })).toBeDisabled()

        await user.click(screen.getByRole("button", { name: "Föregående månad" }))
        expect(screen.getByRole("heading", { level: 2, name: "December 2025" })).toBeInTheDocument()
        expect(screen.getByText("0 pass")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Idag" }))
        expect(screen.getByRole("heading", { level: 2, name: "Januari 2026" })).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Nästa månad" }))
        expect(screen.getByRole("heading", { level: 2, name: "Februari 2026" })).toBeInTheDocument()
    })

    it("marks today quietly, never in ember", async () => {
        await openCalendar()

        const todayCell = screen.getByTestId("calendar-cell-2026-01-29")
        expect(todayCell).toHaveAttribute("aria-current", "date")
        const todayDate = screen.getByTestId("calendar-today")
        expect(todayCell).toContainElement(todayDate)
        expect(todayDate.className).toContain("bg-accent")
        expect(todayDate.className).not.toContain("primary")
    })
})
