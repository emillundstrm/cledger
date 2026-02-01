# ARCHITECTURE.md — CLedger

## High-Level Architecture

The system is a simple full-stack web application:

- Frontend: React + TypeScript + ShadCN UI
- Backend: Spring Boot REST API
- Database: Postgres

## Core Principles

### Use state-of-the-art libraries and tools

- Don't be conservative. Use the latest stable releases and tools.
- Use current best practices.

### Strong Typing Everywhere

- Frontend must use **TypeScript**. No `any` types unless unavoidable.
- Backend should must not accept invalid data and provide good error messages.

### Test What Matters

- Backend: **JUnit 5**
- Frontend: **Vitest**

Focus testing on:

- Core session CRUD
- Analytics calculations
- Key UI interactions

## Frontend Guidelines

### Tech Stack

- React
- TypeScript
- ShadCN UI components
- Tailwind CSS (via ShadCN)
- React-Query for fetching and mutation

### UI Rules

- Use functional components
- Mobile-friendly layout by default
- Use ShadCN components instead of custom UI when possible
- Optimize session entry for speed (<2 min)
- Sensible defaults pre-filled or pre-selected

## Backend Guidelines

### Tech Stack

- Spring Boot
- Spring Web (REST)
- Spring Data JPA

## Code style

- Four spaces for indentation
- It's forbidden to skip curly braces, even for "guard clauses"

