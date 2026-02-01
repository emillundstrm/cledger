import { BrowserRouter, Routes, Route, Navigate } from "react-router"
import AppLayout from "@/components/layout/AppLayout"
import SessionsPage from "@/pages/SessionsPage"
import NewSessionPage from "@/pages/NewSessionPage"
import EditSessionPage from "@/pages/EditSessionPage"
import DashboardPage from "@/pages/DashboardPage"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppLayout />}>
                    <Route index element={<Navigate to="/sessions" replace />} />
                    <Route path="sessions" element={<SessionsPage />} />
                    <Route path="sessions/new" element={<NewSessionPage />} />
                    <Route path="sessions/:id/edit" element={<EditSessionPage />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
