# PRD — Climbing Training Log (MVP)

## Overview
A personal, climbing-first training session log to replace an Excel spreadsheet. The MVP focuses on fast post-session entry and basic analytics. It is designed to stay minimal, local-first, and extensible toward future readiness indicators and optional Garmin enrichment.

## Goals
- Replace manual spreadsheet logging with a purpose-built UI.
- Make post-session logging take <2 minutes.
- Capture climbing-specific training intent (not generic workouts).
- Include subjective session quality signals for future insights.
- Provide basic weekly volume/intensity analytics.
- Run locally with a local database.

## Non-Goals (MVP)
- No mid-session tracking.
- No Garmin sync/import in MVP.
- No social/sharing features.
- No coaching automation or ML.
- No detailed exercise-level strength logging (future).

## Target User
Single user (self). Not intended for commercialization initially.

## Core Concepts

### Session
A single training day entry, logged after the session.

Key properties:
- Date
- Session types (multi-select)
  - Boulder
  - Routes
  - Board
  - Hangboard
  - Strength
  - Prehab
- Intensity (Easy / Moderate / Hard)
- Subjective performance (Weak / Normal / Strong)
  - How capable/strong did I feel?
- Subjective productivity (Low / Normal / High)
  - Did this session feel useful toward my goals?
- Duration (optional)
- Notes (free text)

Optional climbing metrics:
- Max grade
- Hard attempts (rough count)
- Pain flag (finger / elbow / shoulder)

## MVP Features

### 1. Session Logging
- Create new session
- Edit existing session
- Delete session

UI optimized for quick entry:
- Multi-select for session types
- Intensity selector
- Performance + productivity selectors
- Optional numeric fields
- Notes textbox

### 2. Session Timeline
- List view ordered by date
- Quick scanning of recent weeks

### 3. Basic Analytics Dashboard
Simple computed indicators:
- Sessions per week
- Hard sessions in last 7 days
- Performance/productivity trends over time
- Days since last rest day
- Pain flags in last 30 days

### 4. Local-First Architecture
- Runs locally
- Data stored in local DB (SQLite or Postgres)

## Future Extensions (Post-MVP)
- Garmin enrichment via connector layer (pull-on-demand)
- Readiness/overreaching indicator combining training load + HRV/sleep
- Protocol library for hangboard workouts
- Detailed strength exercise logging (sets/reps/loads)
- Mobile-friendly UI improvements

## Tech Stack

### Frontend
- React
- ShadCN UI components
- Responsive layout

### Backend
- Spring Boot REST API
- Local database

## API (Initial)
- `GET /sessions`
- `POST /sessions`
- `PUT /sessions/{id}`
- `DELETE /sessions/{id}`

## Success Criteria
- Logging a session takes <2 minutes.
- Weekly training volume and intensity are visible at a glance.
- Subjective performance/productivity signals enable better reflection.
- Data is easier to review than the spreadsheet.
