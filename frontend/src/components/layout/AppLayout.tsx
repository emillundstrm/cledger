import { Link, Outlet, useLocation } from "react-router"
import { cn } from "@/lib/utils"

const navItems = [
    { label: "Sessions", href: "/sessions" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Insights", href: "/insights" },
]

function AppLayout() {
    const location = useLocation()

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b">
                <div className="container mx-auto flex h-14 items-center gap-6 px-4">
                    <Link to="/sessions" className="text-lg font-bold tracking-tight">
                        CLedger
                    </Link>
                    <nav className="flex gap-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    location.pathname.startsWith(item.href)
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="container mx-auto flex-1 px-4 py-6">
                <Outlet />
            </main>
        </div>
    )
}

export default AppLayout
