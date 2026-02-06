import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import InsightsPage from "./InsightsPage"
import type { Insight } from "@/api/types"

vi.mock("@/api/insights")

import {
    fetchInsights,
    createInsight,
    updateInsight,
    deleteInsight,
} from "@/api/insights"

const mockFetchInsights = vi.mocked(fetchInsights)
const mockCreateInsight = vi.mocked(createInsight)
const mockUpdateInsight = vi.mocked(updateInsight)
const mockDeleteInsight = vi.mocked(deleteInsight)

const sampleInsights: Insight[] = [
    {
        id: "i1",
        content: "Take rest days after hard blocks.",
        pinned: true,
        createdAt: "2026-02-01T10:00:00",
        updatedAt: "2026-02-01T12:00:00",
    },
    {
        id: "i2",
        content: "Focus on finger strength this cycle. Consider adding hangboard sessions twice per week to improve crimp strength gradually.",
        pinned: false,
        createdAt: "2026-01-30T09:00:00",
        updatedAt: "2026-01-31T14:00:00",
    },
]

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/insights"]}>
                <InsightsPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe("InsightsPage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockFetchInsights.mockResolvedValue(sampleInsights)
    })

    it("shows loading state", () => {
        mockFetchInsights.mockReturnValue(new Promise(() => {}))
        renderPage()
        expect(screen.getByText("Loading insights...")).toBeInTheDocument()
    })

    it("shows error state", async () => {
        mockFetchInsights.mockRejectedValue(new Error("fail"))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Failed to load insights.")).toBeInTheDocument()
        })
    })

    it("shows empty state", async () => {
        mockFetchInsights.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/No insights yet/)).toBeInTheDocument()
        })
    })

    it("renders insights list", async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Take rest days after hard blocks.")).toBeInTheDocument()
        })
        expect(screen.getByText(/Focus on finger strength/)).toBeInTheDocument()
    })

    it("shows Pinned badge for pinned insights", async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Pinned")).toBeInTheDocument()
        })
    })

    it("shows add insight form", async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Insights")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: "Add Insight" }))

        expect(screen.getByText("Add Insight")).toBeInTheDocument()
        expect(screen.getByLabelText("Content")).toBeInTheDocument()
        expect(screen.getByLabelText("Pin this insight")).toBeInTheDocument()
    })

    it("creates a new insight", async () => {
        mockCreateInsight.mockResolvedValue({
            id: "i3",
            content: "New insight",
            pinned: false,
            createdAt: "2026-02-02T10:00:00",
            updatedAt: "2026-02-02T10:00:00",
        })

        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Insights")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: "Add Insight" }))
        await user.type(screen.getByLabelText("Content"), "New insight")
        await user.click(screen.getByRole("button", { name: "Save Insight" }))

        await waitFor(() => {
            expect(mockCreateInsight).toHaveBeenCalledWith({
                content: "New insight",
                pinned: false,
            })
        })
    })

    it("opens edit view when clicking edit button on an insight", async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Take rest days after hard blocks.")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        const editButtons = screen.getAllByRole("button", { name: "Edit" })
        await user.click(editButtons[0])

        expect(screen.getByText("Edit Insight")).toBeInTheDocument()
        expect(screen.getByDisplayValue("Take rest days after hard blocks.")).toBeInTheDocument()
    })

    it("each insight card has an edit button", async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Take rest days after hard blocks.")).toBeInTheDocument()
        })

        // Each insight should have an edit button
        const editButtons = screen.getAllByRole("button", { name: "Edit" })
        expect(editButtons).toHaveLength(2)
    })

    it("updates an existing insight", async () => {
        mockUpdateInsight.mockResolvedValue({
            ...sampleInsights[0],
            content: "Updated content",
        })

        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Take rest days after hard blocks.")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        // Click the edit button (not the card itself)
        const editButtons = screen.getAllByRole("button", { name: "Edit" })
        await user.click(editButtons[0])

        const textarea = screen.getByDisplayValue("Take rest days after hard blocks.")
        await user.clear(textarea)
        await user.type(textarea, "Updated content")
        await user.click(screen.getByRole("button", { name: "Update Insight" }))

        await waitFor(() => {
            expect(mockUpdateInsight).toHaveBeenCalledWith("i1", {
                content: "Updated content",
                pinned: true,
            })
        })
    })

    it("deletes an insight with confirmation", async () => {
        mockDeleteInsight.mockResolvedValue(undefined)

        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Take rest days after hard blocks.")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        // Click the edit button to enter edit mode
        const editButtons = screen.getAllByRole("button", { name: "Edit" })
        await user.click(editButtons[0])

        // Click the Delete trigger button
        const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
        await user.click(deleteButtons[0])

        // Confirm in dialog
        await waitFor(() => {
            expect(screen.getByText(/Are you sure you want to delete this insight/)).toBeInTheDocument()
        })

        const confirmButtons = screen.getAllByRole("button", { name: "Delete" })
        await user.click(confirmButtons[confirmButtons.length - 1])

        await waitFor(() => {
            expect(mockDeleteInsight).toHaveBeenCalledWith("i1")
        })
    })

    it("has Insights navigation link", () => {
        renderPage()
        // InsightsPage itself doesn't contain the nav; this is covered by AppLayout tests
        expect(screen.getByText("Insights")).toBeInTheDocument()
    })

    it("renders markdown content as formatted HTML", async () => {
        mockFetchInsights.mockResolvedValue([
            {
                id: "i-md",
                content: "## Training Plan\n\n- **Boulder** twice per week\n- Use `hangboard` for finger strength\n\nStay consistent!",
                pinned: false,
                createdAt: "2026-02-01T10:00:00",
                updatedAt: "2026-02-01T12:00:00",
            },
        ])

        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Training Plan")).toBeInTheDocument()
        })

        // Heading renders as h2
        const heading = screen.getByText("Training Plan")
        expect(heading.tagName).toBe("H2")

        // Bold text renders as strong
        const bold = screen.getByText("Boulder")
        expect(bold.tagName).toBe("STRONG")

        // Inline code renders as code
        const code = screen.getByText("hangboard")
        expect(code.tagName).toBe("CODE")

        // List items rendered
        expect(screen.getByText(/twice per week/)).toBeInTheDocument()
        expect(screen.getByText("Stay consistent!")).toBeInTheDocument()
    })

    it("truncates long content and shows expand hint", async () => {
        const longContent = "# Big Title\n\n" + "A".repeat(250)
        mockFetchInsights.mockResolvedValue([
            {
                id: "i-long",
                content: longContent,
                pinned: false,
                createdAt: "2026-02-01T10:00:00",
                updatedAt: "2026-02-01T12:00:00",
            },
        ])

        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Click to expand")).toBeInTheDocument()
        })
    })

    it("expands long content when clicking the card", async () => {
        const longContent = "# Big Title\n\n" + "A".repeat(250)
        mockFetchInsights.mockResolvedValue([
            {
                id: "i-long",
                content: longContent,
                pinned: false,
                createdAt: "2026-02-01T10:00:00",
                updatedAt: "2026-02-01T12:00:00",
            },
        ])

        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Click to expand")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        // Click on the card itself to expand
        await user.click(screen.getByText("Click to expand"))

        await waitFor(() => {
            expect(screen.getByText("Click to collapse")).toBeInTheDocument()
        })
        expect(screen.getByText("Big Title")).toBeInTheDocument()
    })

    it("collapses expanded content when clicking the card again", async () => {
        const longContent = "# Big Title\n\n" + "A".repeat(250)
        mockFetchInsights.mockResolvedValue([
            {
                id: "i-long",
                content: longContent,
                pinned: false,
                createdAt: "2026-02-01T10:00:00",
                updatedAt: "2026-02-01T12:00:00",
            },
        ])

        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Click to expand")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        // Click to expand
        await user.click(screen.getByText("Click to expand"))
        await waitFor(() => {
            expect(screen.getByText("Click to collapse")).toBeInTheDocument()
        })

        // Click to collapse
        await user.click(screen.getByText("Click to collapse"))
        await waitFor(() => {
            expect(screen.getByText("Click to expand")).toBeInTheDocument()
        })
    })
})
