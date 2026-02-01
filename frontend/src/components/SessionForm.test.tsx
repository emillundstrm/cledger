import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import SessionForm from "@/components/SessionForm"

const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

function renderForm(props: Partial<React.ComponentProps<typeof SessionForm>> = {}) {
    return render(
        <SessionForm
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
            submitLabel="Log Session"
            {...props}
        />
    )
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe("SessionForm", () => {
    it("renders all required form fields", () => {
        renderForm()
        expect(screen.getByText("Date")).toBeInTheDocument()
        expect(screen.getByText("Session Types")).toBeInTheDocument()
        expect(screen.getByText("Intensity")).toBeInTheDocument()
        expect(screen.getByText("Performance")).toBeInTheDocument()
        expect(screen.getByText("Productivity")).toBeInTheDocument()
    })

    it("renders all session type toggle buttons", () => {
        renderForm()
        expect(screen.getByText("Boulder")).toBeInTheDocument()
        expect(screen.getByText("Routes")).toBeInTheDocument()
        expect(screen.getByText("Board")).toBeInTheDocument()
        expect(screen.getByText("Hangboard")).toBeInTheDocument()
        expect(screen.getByText("Strength")).toBeInTheDocument()
        expect(screen.getByText("Prehab")).toBeInTheDocument()
    })

    it("renders intensity radio options", () => {
        renderForm()
        expect(screen.getByLabelText("Easy")).toBeInTheDocument()
        expect(screen.getByLabelText("Moderate")).toBeInTheDocument()
        expect(screen.getByLabelText("Hard")).toBeInTheDocument()
    })

    it("renders performance radio options", () => {
        renderForm()
        expect(screen.getByLabelText("Weak")).toBeInTheDocument()
        // "Normal" appears multiple times (performance + productivity), so check radio groups exist
        expect(screen.getByLabelText("Strong")).toBeInTheDocument()
    })

    it("renders productivity radio options", () => {
        renderForm()
        expect(screen.getByLabelText("Low")).toBeInTheDocument()
        expect(screen.getByLabelText("High")).toBeInTheDocument()
    })

    it("renders optional fields", () => {
        renderForm()
        expect(screen.getByLabelText("Duration (min)")).toBeInTheDocument()
        expect(screen.getByLabelText("Max Grade")).toBeInTheDocument()
        expect(screen.getByLabelText("Hard Attempts")).toBeInTheDocument()
        expect(screen.getByLabelText("Notes")).toBeInTheDocument()
    })

    it("renders pain flag checkboxes", () => {
        renderForm()
        expect(screen.getByLabelText("Finger")).toBeInTheDocument()
        expect(screen.getByLabelText("Elbow")).toBeInTheDocument()
        expect(screen.getByLabelText("Shoulder")).toBeInTheDocument()
    })

    it("renders submit and cancel buttons", () => {
        renderForm()
        expect(screen.getByRole("button", { name: "Log Session" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
    })

    it("disables submit when no session types selected", () => {
        renderForm()
        const submitButton = screen.getByRole("button", { name: "Log Session" })
        expect(submitButton).toBeDisabled()
    })

    it("calls onCancel when cancel button is clicked", async () => {
        const user = userEvent.setup()
        renderForm()
        await user.click(screen.getByRole("button", { name: "Cancel" }))
        expect(mockOnCancel).toHaveBeenCalledOnce()
    })

    it("submits form data when a type is selected and submit is clicked", async () => {
        const user = userEvent.setup()
        renderForm()

        // Select a session type
        await user.click(screen.getByText("Boulder"))

        // Submit
        await user.click(screen.getByRole("button", { name: "Log Session" }))

        expect(mockOnSubmit).toHaveBeenCalledOnce()
        const submittedData = mockOnSubmit.mock.calls[0][0]
        expect(submittedData.types).toContain("boulder")
        expect(submittedData.intensity).toBe("moderate") // default
        expect(submittedData.performance).toBe("normal") // default
        expect(submittedData.productivity).toBe("normal") // default
    })

    it("shows custom submit label", () => {
        renderForm({ submitLabel: "Save Changes" })
        expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument()
    })

    it("shows 'Saving...' when isSubmitting is true", () => {
        renderForm({ isSubmitting: true })
        expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument()
    })

    it("pre-fills form with initialData", () => {
        renderForm({
            initialData: {
                date: "2026-01-28",
                types: ["boulder", "hangboard"],
                intensity: "hard",
                performance: "strong",
                productivity: "high",
                durationMinutes: 90,
                maxGrade: "7A",
                hardAttempts: 5,
                painFlags: ["finger"],
                notes: "Great session",
            },
        })

        expect(screen.getByLabelText("Duration (min)")).toHaveValue(90)
        expect(screen.getByLabelText("Max Grade")).toHaveValue("7A")
        expect(screen.getByLabelText("Hard Attempts")).toHaveValue(5)
        expect(screen.getByLabelText("Notes")).toHaveValue("Great session")
    })

    it("submits optional fields when filled", async () => {
        const user = userEvent.setup()
        renderForm()

        // Select a type to enable submit
        await user.click(screen.getByText("Routes"))

        // Fill optional fields
        await user.type(screen.getByLabelText("Duration (min)"), "120")
        await user.type(screen.getByLabelText("Max Grade"), "6b+")
        await user.type(screen.getByLabelText("Hard Attempts"), "3")
        await user.type(screen.getByLabelText("Notes"), "Outdoor session")

        // Select pain flag
        await user.click(screen.getByLabelText("Elbow"))

        await user.click(screen.getByRole("button", { name: "Log Session" }))

        const data = mockOnSubmit.mock.calls[0][0]
        expect(data.types).toContain("routes")
        expect(data.durationMinutes).toBe(120)
        expect(data.maxGrade).toBe("6b+")
        expect(data.hardAttempts).toBe(3)
        expect(data.notes).toBe("Outdoor session")
        expect(data.painFlags).toContain("elbow")
    })
})
