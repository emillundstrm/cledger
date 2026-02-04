import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router"
import LoginPage from "@/pages/LoginPage"

const mockSignIn = vi.fn()
const mockNavigate = vi.fn()

vi.mock("react-router", async () => {
    const actual = await vi.importActual<typeof import("react-router")>("react-router")
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

vi.mock("@/auth/AuthContext", () => ({
    useAuth: () => ({
        signIn: mockSignIn,
        session: null,
        user: null,
        loading: false,
        signOut: vi.fn(),
    }),
}))

function renderLoginPage() {
    return render(
        <MemoryRouter initialEntries={["/login"]}>
            <LoginPage />
        </MemoryRouter>
    )
}

describe("LoginPage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockSignIn.mockResolvedValue({ error: null })
    })

    it("renders email and password fields", () => {
        renderLoginPage()
        expect(screen.getByLabelText("Email")).toBeInTheDocument()
        expect(screen.getByLabelText("Password")).toBeInTheDocument()
    })

    it("renders sign in button", () => {
        renderLoginPage()
        expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
    })

    it("renders CLedger title", () => {
        renderLoginPage()
        expect(screen.getByText("CLedger")).toBeInTheDocument()
    })

    it("calls signIn with email and password on submit", async () => {
        const user = userEvent.setup()
        renderLoginPage()

        await user.type(screen.getByLabelText("Email"), "test@example.com")
        await user.type(screen.getByLabelText("Password"), "password123")
        await user.click(screen.getByRole("button", { name: "Sign in" }))

        expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123")
    })

    it("navigates to /sessions after successful login", async () => {
        const user = userEvent.setup()
        renderLoginPage()

        await user.type(screen.getByLabelText("Email"), "test@example.com")
        await user.type(screen.getByLabelText("Password"), "password123")
        await user.click(screen.getByRole("button", { name: "Sign in" }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith("/sessions", { replace: true })
        })
    })

    it("displays error message on failed sign in", async () => {
        mockSignIn.mockResolvedValue({ error: new Error("Invalid credentials") })
        const user = userEvent.setup()
        renderLoginPage()

        await user.type(screen.getByLabelText("Email"), "test@example.com")
        await user.type(screen.getByLabelText("Password"), "wrong")
        await user.click(screen.getByRole("button", { name: "Sign in" }))

        await waitFor(() => {
            expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials")
        })
    })

    it("re-enables form after login error", async () => {
        mockSignIn.mockResolvedValue({ error: new Error("Invalid credentials") })
        const user = userEvent.setup()
        renderLoginPage()

        await user.type(screen.getByLabelText("Email"), "test@example.com")
        await user.type(screen.getByLabelText("Password"), "wrong")
        await user.click(screen.getByRole("button", { name: "Sign in" }))

        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument()
        })

        expect(screen.getByLabelText("Email")).not.toBeDisabled()
        expect(screen.getByLabelText("Password")).not.toBeDisabled()
        expect(screen.getByRole("button", { name: "Sign in" })).not.toBeDisabled()
    })

    it("disables inputs and button while signing in", async () => {
        mockSignIn.mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
        )
        const user = userEvent.setup()
        renderLoginPage()

        await user.type(screen.getByLabelText("Email"), "test@example.com")
        await user.type(screen.getByLabelText("Password"), "password123")
        await user.click(screen.getByRole("button", { name: "Sign in" }))

        expect(screen.getByLabelText("Email")).toBeDisabled()
        expect(screen.getByLabelText("Password")).toBeDisabled()
        expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled()
    })
})
