import { createBrowserRouter, Navigate, RouterProvider } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/auth/AuthContext"
import ProtectedRoute from "@/auth/ProtectedRoute"
import AppLayout from "@/components/layout/AppLayout"
import LoginPage from "@/pages/LoginPage"
import SessionsPage from "@/pages/SessionsPage"
import NewSessionPage from "@/pages/NewSessionPage"
import EditSessionPage from "@/pages/EditSessionPage"
import DashboardPage from "@/pages/DashboardPage"
import NotesPage from "@/pages/NotesPage"
import NotePage from "@/pages/NotePage"
import NewNotePage from "@/pages/NewNotePage"
import JournalPage from "@/pages/JournalPage"
import JournalEntryPage from "@/pages/JournalEntryPage"
import FingerboardPage from "@/pages/FingerboardPage"
import FingerboardWorkoutPage from "@/pages/FingerboardWorkoutPage"

const queryClient = new QueryClient()

const router = createBrowserRouter(
    [
        {
            path: "login",
            element: <LoginPage />,
        },
        {
            element: (
                <ProtectedRoute>
                    <AppLayout />
                </ProtectedRoute>
            ),
            children: [
                { index: true, element: <Navigate to="/sessions" replace /> },
                { path: "sessions", element: <SessionsPage /> },
                { path: "sessions/new", element: <NewSessionPage /> },
                { path: "sessions/:id", element: <Navigate to="edit" replace /> },
                { path: "sessions/:id/edit", element: <EditSessionPage /> },
                { path: "fingerboard", element: <FingerboardPage /> },
                { path: "fingerboard/:protocol", element: <FingerboardWorkoutPage /> },
                { path: "dashboard", element: <DashboardPage /> },
                { path: "notes", element: <NotesPage /> },
                { path: "notes/new", element: <NewNotePage /> },
                { path: "notes/:id", element: <NotePage /> },
                { path: "journal", element: <JournalPage /> },
                { path: "journal/:id", element: <JournalEntryPage /> },
                { path: "insights", element: <Navigate to="/notes" replace /> },
            ],
        },
    ],
    { basename: "/cledger" }
)

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </QueryClientProvider>
    )
}

export default App
