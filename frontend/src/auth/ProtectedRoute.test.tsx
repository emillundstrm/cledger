import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MemoryRouter, Routes, Route } from "react-router"
import ProtectedRoute from "@/auth/ProtectedRoute"

const mockAuth = {
    session: null as unknown,
    user: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
}

vi.mock("@/auth/AuthContext", () => ({
    useAuth: () => mockAuth,
}))

describe("ProtectedRoute", () => {
    it("shows loading state when auth is loading", () => {
        mockAuth.loading = true
        mockAuth.session = null

        render(
            <MemoryRouter initialEntries={["/"]}>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        )

        expect(screen.getByText("Loading…")).toBeInTheDocument()
        expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
        mockAuth.loading = false
    })

    it("redirects to /login when not authenticated", () => {
        mockAuth.loading = false
        mockAuth.session = null

        render(
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <div>Protected Content</div>
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        )

        expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
        expect(screen.getByText("Login Page")).toBeInTheDocument()
    })

    it("renders children when authenticated", () => {
        mockAuth.loading = false
        mockAuth.session = { user: { id: "123" } }

        render(
            <MemoryRouter initialEntries={["/"]}>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        )

        expect(screen.getByText("Protected Content")).toBeInTheDocument()
        mockAuth.session = null
    })
})
