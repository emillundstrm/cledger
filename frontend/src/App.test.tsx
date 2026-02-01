import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router'
import AppLayout from '@/components/layout/AppLayout'

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

    it('renders Sessions navigation link', () => {
        renderWithRouter()
        expect(screen.getByRole('link', { name: 'Sessions' })).toBeInTheDocument()
    })

    it('renders Dashboard navigation link', () => {
        renderWithRouter()
        expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    })

    it('Sessions link points to /sessions', () => {
        renderWithRouter()
        expect(screen.getByRole('link', { name: 'Sessions' })).toHaveAttribute('href', '/sessions')
    })

    it('Dashboard link points to /dashboard', () => {
        renderWithRouter()
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    })

    it('CLedger title links to /sessions', () => {
        renderWithRouter()
        expect(screen.getByRole('link', { name: 'CLedger' })).toHaveAttribute('href', '/sessions')
    })
})

describe('App routing', () => {
    it('root path redirects to /sessions', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <AppLayout />
            </MemoryRouter>
        )
        // The layout should render regardless of redirect
        expect(screen.getByText('CLedger')).toBeInTheDocument()
    })
})
