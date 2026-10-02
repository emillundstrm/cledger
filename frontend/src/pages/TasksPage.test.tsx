import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import TasksPage from "./TasksPage"
import type { Task } from "@/api/types"
import { daysAgoLocal, todayLocal } from "@/lib/dates"

vi.mock("@/api/tasks")
vi.mock("@/api/notes")

import { createTask, fetchTaskLists, fetchTasks, setTaskStatus } from "@/api/tasks"

const mockFetchTasks = vi.mocked(fetchTasks)
const mockFetchTaskLists = vi.mocked(fetchTaskLists)
const mockCreateTask = vi.mocked(createTask)
const mockSetTaskStatus = vi.mocked(setTaskStatus)

function makeTask(overrides: Partial<Task>): Task {
    return {
        id: "t1",
        list: "inbox",
        title: "Boka fysioterapeut",
        notes: null,
        status: "open",
        dueDate: null,
        completedAt: null,
        source: "user",
        archivedAt: null,
        createdAt: "2026-09-01T10:00:00Z",
        updatedAt: "2026-09-01T10:00:00Z",
        ...overrides,
    }
}

const sampleTasks: Task[] = [
    makeTask({ id: "t1", dueDate: daysAgoLocal(2) }),
    makeTask({ id: "t2", title: "Köp kalk", list: "inköp", dueDate: todayLocal() }),
    makeTask({ id: "t3", title: "Svara på mejl", status: "done", completedAt: "2026-09-30T10:00:00Z" }),
]

function renderAt(path = "/tasks") {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route path="/tasks/:id" element={<TasksPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe("TasksPage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockFetchTasks.mockResolvedValue(sampleTasks)
        mockFetchTaskLists.mockResolvedValue([
            { list: "inbox", openCount: 1, totalCount: 2 },
            { list: "inköp", openCount: 1, totalCount: 1 },
        ])
    })

    it("shows the inbox by default, with overdue tasks marked", async () => {
        renderAt()
        await waitFor(() => {
            expect(screen.getByText("Boka fysioterapeut")).toBeInTheDocument()
        })
        expect(screen.queryByText("Köp kalk")).not.toBeInTheDocument()
        expect(screen.getByText(/Overdue/)).toBeInTheDocument()
    })

    it("switches lists, and All shows every list", async () => {
        renderAt()
        await waitFor(() => {
            expect(screen.getByText("Boka fysioterapeut")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: /^inköp/ }))
        expect(screen.getByText("Köp kalk")).toBeInTheDocument()
        expect(screen.getByText("Today")).toBeInTheDocument()
        expect(screen.queryByText("Boka fysioterapeut")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: /^All/ }))
        expect(screen.getByText("Köp kalk")).toBeInTheDocument()
        expect(screen.getByText("Boka fysioterapeut")).toBeInTheDocument()
    })

    it("adds a task to the active list", async () => {
        mockCreateTask.mockResolvedValue(makeTask({ id: "t9", title: "Ny" }))
        renderAt()
        await waitFor(() => {
            expect(screen.getByText("Boka fysioterapeut")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: /^inköp/ }))
        await user.type(screen.getByLabelText("New task"), "Tejp{Enter}")

        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalledWith({
                title: "Tejp",
                list: "inköp",
                notes: null,
                dueDate: null,
            })
        })
    })

    it("completes a task", async () => {
        mockSetTaskStatus.mockResolvedValue(makeTask({ status: "done" }))
        renderAt()
        await waitFor(() => {
            expect(screen.getByText("Boka fysioterapeut")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getByLabelText("Complete Boka fysioterapeut"))

        await waitFor(() => {
            expect(mockSetTaskStatus).toHaveBeenCalledWith("t1", "done")
        })
    })

    it("keeps done tasks collapsed, and reopens them", async () => {
        mockSetTaskStatus.mockResolvedValue(makeTask({ id: "t3" }))
        renderAt()
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Done \(1\)/ })).toBeInTheDocument()
        })
        expect(screen.queryByText("Svara på mejl")).not.toBeInTheDocument()

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: /Done \(1\)/ }))
        await user.click(screen.getByLabelText("Reopen Svara på mejl"))

        await waitFor(() => {
            expect(mockSetTaskStatus).toHaveBeenCalledWith("t3", "open")
        })
    })

    it("opens a linked task, even in another list", async () => {
        mockFetchTasks.mockResolvedValue([
            ...sampleTasks,
            makeTask({ id: "t4", title: "Länkad", list: "inköp", notes: "Detaljer här" }),
        ])
        renderAt("/tasks/t4")
        await waitFor(() => {
            expect(screen.getByText("Detaljer här")).toBeInTheDocument()
        })
        const item = screen.getByText("Länkad").closest("li")!
        expect(within(item).getByRole("button", { name: "Edit" })).toBeInTheDocument()
    })
})
