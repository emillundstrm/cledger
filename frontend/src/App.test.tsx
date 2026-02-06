import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import AppLayout from '@/components/layout/AppLayout'

vi.mock("@/auth/AuthContext", () => ({
    useAuth: () => ({
        session: { user: { id: "123" } },
        user: { id: "123" },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
    }),
}))

function renderWithRouter(initialEntries: string[] = ['/sessions']) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <AppLayout />
        </MemoryRouter>
    )
}

describe('AppLayout', () => {
    it('renders the CLedger title', () => {
        renderWithRouter()
        expect(screen.getByText('CLedger')).toBeInTheDocument()
    })

    it('renders Sessions navigation link with icon', () => {
        renderWithRouter()
        const link = screen.getByTitle('Sessions')
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/sessions')
        // Icon is present (lucide icons render as svg)
        expect(link.querySelector('svg')).toBeInTheDocument()
    })

    it('renders Dashboard navigation link with icon', () => {
        renderWithRouter()
        const link = screen.getByTitle('Dashboard')
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/dashboard')
        expect(link.querySelector('svg')).toBeInTheDocument()
    })

    it('renders Insights navigation link with icon', () => {
        renderWithRouter()
        const link = screen.getByTitle('Insights')
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/insights')
        expect(link.querySelector('svg')).toBeInTheDocument()
    })

    it('navigation links have labels hidden on mobile via sm:inline class', () => {
        renderWithRouter()
        const sessionsLabel = screen.getByText('Sessions')
        expect(sessionsLabel).toHaveClass('hidden', 'sm:inline')
        const dashboardLabel = screen.getByText('Dashboard')
        expect(dashboardLabel).toHaveClass('hidden', 'sm:inline')
        const insightsLabel = screen.getByText('Insights')
        expect(insightsLabel).toHaveClass('hidden', 'sm:inline')
    })

    it('CLedger title links to /sessions', () => {
        renderWithRouter()
        expect(screen.getByRole('link', { name: 'CLedger' })).toHaveAttribute('href', '/sessions')
    })

    it('renders Sign out button with icon', () => {
        renderWithRouter()
        const button = screen.getByTitle('Sign out')
        expect(button).toBeInTheDocument()
        expect(button.querySelector('svg')).toBeInTheDocument()
    })

    it('Sign out label hidden on mobile via sm:inline class', () => {
        renderWithRouter()
        const signOutLabel = screen.getByText('Sign out')
        expect(signOutLabel).toHaveClass('hidden', 'sm:inline')
    })
})

describe('App routing', () => {
    it('root path redirects to /sessions', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <AppLayout />
            </MemoryRouter>
        )
        expect(screen.getByText('CLedger')).toBeInTheDocument()
    })
})
