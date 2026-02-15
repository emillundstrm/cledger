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
            <header className="border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-10">
                <div className="container mx-auto flex h-14 items-center px-4 gap-4">
                    <Link to="/sessions" className="font-display text-xl tracking-tight shrink-0">
                        CLedger
                    </Link>
                    <nav className="flex flex-1 justify-center gap-6 sm:flex-none sm:justify-start sm:gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname.startsWith(item.href)
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-1.5 text-sm font-medium transition-colors rounded-lg px-3 py-1.5",
                                        isActive
                                            ? "text-foreground bg-accent"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    )}
                                    title={item.label}
                                >
                                    <Icon className="h-6 w-6 sm:h-4 sm:w-4" />
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
                            className="gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <LogOut className="size-6 sm:size-4" />
                            <span className="hidden sm:inline">Sign out</span>
                        </Button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto flex-1 px-4 py-8">
                <Outlet />
            </main>
        </div>
    )
}

export default AppLayout
