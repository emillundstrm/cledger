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
import InsightsPage from "@/pages/InsightsPage"
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
                { path: "sessions/:id/edit", element: <EditSessionPage /> },
                { path: "fingerboard", element: <FingerboardPage /> },
                { path: "fingerboard/:protocol", element: <FingerboardWorkoutPage /> },
                { path: "dashboard", element: <DashboardPage /> },
                { path: "insights", element: <InsightsPage /> },
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
