import '@testing-library/jest-dom/vitest'

// Polyfill ResizeObserver for Radix UI components in jsdom
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

// Polyfill scrollIntoView for cmdk (Command) component in jsdom
Element.prototype.scrollIntoView = function () {}
