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

    it('groups training pages under one Training section', () => {
        renderWithRouter()
        const link = screen.getByTitle('Training')
        expect(link).toHaveAttribute('href', '/sessions')
        expect(link.querySelector('svg')).toBeInTheDocument()
        expect(screen.queryByTitle('Sessions')).not.toBeInTheDocument()
    })

    it.each([
        ['Notes', '/notes'],
        ['Journal', '/journal'],
    ])('renders %s as a top-level section with icon', (label, href) => {
        renderWithRouter()
        const link = screen.getByTitle(label)
        expect(link).toHaveAttribute('href', href)
        expect(link.querySelector('svg')).toBeInTheDocument()
    })

    it.each(['/sessions', '/fingerboard', '/dashboard'])(
        'shows the training pages as a second row on %s',
        (path) => {
            renderWithRouter([path])
            const subNav = screen.getByRole('navigation', { name: 'Training pages' })
            expect(subNav).toHaveTextContent('SessionsFingerboardDashboard')
            expect(screen.getByTitle('Training')).toHaveClass('tab-pill-active')
        },
    )

    it('marks the current training page in the second row', () => {
        renderWithRouter(['/fingerboard/max_lift'])
        expect(screen.getByRole('link', { name: 'Fingerboard' })).toHaveClass('tab-pill-active')
        expect(screen.getByRole('link', { name: 'Sessions' })).not.toHaveClass('tab-pill-active')
    })

    it('has no second row outside training', () => {
        renderWithRouter(['/notes'])
        expect(screen.queryByRole('navigation', { name: 'Training pages' })).not.toBeInTheDocument()
        expect(screen.getByTitle('Notes')).toHaveClass('tab-pill-active')
    })

    it('section labels are hidden on mobile via sm:inline class', () => {
        renderWithRouter(['/notes'])
        for (const label of ['Training', 'Notes', 'Journal']) {
            expect(screen.getByText(label)).toHaveClass('hidden', 'sm:inline')
        }
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
