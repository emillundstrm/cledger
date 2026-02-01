import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
    it('renders the CLedger heading', () => {
        render(<App />)
        expect(screen.getByText('CLedger')).toBeInTheDocument()
    })

    it('renders the description', () => {
        render(<App />)
        expect(screen.getByText('Personal climbing training log')).toBeInTheDocument()
    })
})
