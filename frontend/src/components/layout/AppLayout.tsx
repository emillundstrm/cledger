import { Link, Outlet, useLocation } from "react-router"
import { useAuth } from "@/auth/AuthContext"
import ThemeSwitcher from "@/components/layout/ThemeSwitcher"
import { cn } from "@/lib/utils"
import { CalendarDays, BarChart3, Lightbulb, LogOut, HandGrab } from "lucide-react"

const navItems = [
    { label: "Sessions", href: "/sessions", icon: CalendarDays },
    { label: "Fingerboard", href: "/fingerboard", icon: HandGrab },
    { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "Insights", href: "/insights", icon: Lightbulb },
]

function AppLayout() {
    const location = useLocation()
    const { signOut } = useAuth()

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b border-border backdrop-blur-xl bg-background/85 sticky top-0 z-10">
                <div className="mx-auto flex h-[58px] w-full max-w-[1240px] items-center gap-2 px-4 sm:gap-6 sm:px-6">
                    <Link
                        to="/sessions"
                        className="flex shrink-0 items-center gap-2 font-display text-[21px] tracking-tight"
                    >
                        <span
                            aria-hidden="true"
                            className="inline-block size-2.5 rotate-45 rounded-[3px] bg-primary shadow-[0_0_12px_var(--glow)]"
                        />
                        CLedger
                    </Link>
                    <nav className="flex flex-1 justify-center gap-1 sm:flex-none sm:justify-start sm:gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname.startsWith(item.href)
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    viewTransition
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-[10px] px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-200 active:scale-95",
                                        isActive
                                            ? "text-foreground bg-accent"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                    )}
                                    title={item.label}
                                >
                                    <Icon className="h-6 w-6 sm:hidden" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="ml-auto shrink-0">
                        <button
                            type="button"
                            onClick={signOut}
                            title="Sign out"
                            className="flex cursor-pointer items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-sm text-dim transition-colors hover:text-foreground"
                        >
                            <LogOut className="size-6 sm:hidden" />
                            <span className="hidden sm:inline">Sign out</span>
                            <span aria-hidden="true" className="hidden sm:inline">→</span>
                        </button>
                    </div>
                </div>
            </header>
            <main
                className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-9 pb-20 sm:px-6"
                style={{ viewTransitionName: "page-content" }}
            >
                <Outlet />
            </main>
            <ThemeSwitcher />
        </div>
    )
}

export default AppLayout
