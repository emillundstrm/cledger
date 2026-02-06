import { Link, Outlet, useLocation } from "react-router"
import { useAuth } from "@/auth/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarDays, BarChart3, Lightbulb, LogOut } from "lucide-react"

const navItems = [
    { label: "Sessions", href: "/sessions", icon: CalendarDays },
    { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "Insights", href: "/insights", icon: Lightbulb },
]

function AppLayout() {
    const location = useLocation()
    const { signOut } = useAuth()

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b">
                <div className="container mx-auto flex h-14 items-center gap-4 sm:gap-6 px-4">
                    <Link to="/sessions" className="text-lg font-bold tracking-tight shrink-0">
                        CLedger
                    </Link>
                    <nav className="flex gap-2 sm:gap-4">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary",
                                        location.pathname.startsWith(item.href)
                                            ? "text-foreground"
                                            : "text-muted-foreground"
                                    )}
                                    title={item.label}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="ml-auto shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={signOut}
                            title="Sign out"
                            className="gap-1"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Sign out</span>
                        </Button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto flex-1 px-4 py-6">
                <Outlet />
            </main>
        </div>
    )
}

export default AppLayout
