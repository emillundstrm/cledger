import { Navigate, useLocation } from "react-router"
import { useAuth } from "@/auth/AuthContext"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { session, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Laddar…</p>
            </div>
        )
    }

    if (!session) {
        // Login sends the user back here, e.g. to an OAuth consent request
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    }

    return <>{children}</>
}

export default ProtectedRoute
