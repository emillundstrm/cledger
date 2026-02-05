# ARCHITECTURE.md — CLedger

## High-Level Architecture

The system is a web application with a Supabase backend:

- Frontend: React + TypeScript + ShadCN UI (hosted on GitHub Pages)
- Backend: Supabase (managed PostgreSQL, PostgREST API, Auth, Row Level Security)
- MCP Server: Node.js server exposing training data to LLM agents via Supabase client

## Core Principles

### Use state-of-the-art libraries and tools

- Don't be conservative. Use the latest stable releases and tools.
- Use current best practices.

### Strong Typing Everywhere

- Frontend must use **TypeScript**. No `any` types unless unavoidable.
- Database schema enforces constraints. RLS policies enforce data isolation.

### Test What Matters

- Frontend: **Vitest**
- Database: Supabase migrations with RLS policy verification

Focus testing on:

- Core session CRUD
- Analytics calculations (via Supabase RPC functions)
- Key UI interactions

## Frontend Guidelines

### Tech Stack

- React
- TypeScript
- ShadCN UI components
- Tailwind CSS (via ShadCN)
- React-Query for fetching and mutation
- `@supabase/supabase-js` for data access and auth

### UI Rules

- Use functional components
- Mobile-friendly layout by default
- Use ShadCN components instead of custom UI when possible
- Optimize session entry for speed (<2 min)
- Sensible defaults pre-filled or pre-selected

## Backend (Supabase)

### Data Layer

- Supabase managed PostgreSQL with PostgREST API
- `@supabase/supabase-js` client for all data access
- Row Level Security on all tables (`auth.uid() = user_id`)
- Analytics via PostgreSQL RPC functions

### Auth

- Supabase Auth with email+password
- No self-service sign-up (users invited via Supabase dashboard)
- Frontend uses AuthProvider context for session management

### MCP Server

- Node.js + `@modelcontextprotocol/sdk` + `@supabase/supabase-js`
- Authenticates as a specific user (RLS applies)
- Exposes training data to LLM agents for coaching

## Code style

- Four spaces for indentation
- It's forbidden to skip curly braces, even for "guard clauses"
