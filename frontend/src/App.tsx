import { BrowserRouter, Routes, Route, Navigate } from "react-router"
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

const queryClient = new QueryClient()

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="login" element={<LoginPage />} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="/sessions" replace />} />
                            <Route path="sessions" element={<SessionsPage />} />
                            <Route path="sessions/new" element={<NewSessionPage />} />
                            <Route path="sessions/:id/edit" element={<EditSessionPage />} />
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="insights" element={<InsightsPage />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    )
}

export default App
