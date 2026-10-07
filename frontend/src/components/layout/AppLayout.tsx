import type { CSSProperties } from "react"
import { Link, Outlet, useLocation } from "react-router"
import { useAuth } from "@/auth/AuthContext"
import ThemeSwitcher from "@/components/layout/ThemeSwitcher"
import { cn } from "@/lib/utils"
import { Mountain, NotebookPen, BookOpen, LogOut, type LucideIcon } from "lucide-react"

interface NavPage {
    label: string
    href: string
}

interface NavSection {
    label: string
    href: string
    icon: LucideIcon
    /** Pages shown as a second row while the section is active. */
    pages?: NavPage[]
}

// Training is one area among several, so its pages are grouped under it
// rather than sitting at the same level as Notes and Journal.
const navSections: NavSection[] = [
    {
        label: "Träning",
        href: "/sessions",
        icon: Mountain,
        pages: [
            { label: "Pass", href: "/sessions" },
            { label: "Fingerträning", href: "/fingerboard" },
            { label: "Översikt", href: "/dashboard" },
        ],
    },
    { label: "Anteckningar", href: "/notes", icon: NotebookPen },
    { label: "Dagbok", href: "/journal", icon: BookOpen },
]

function isSectionActive(section: NavSection, pathname: string): boolean {
    const hrefs = section.pages ? section.pages.map((p) => p.href) : [section.href]
    return hrefs.some((href) => pathname.startsWith(href))
}

function AppLayout() {
    const location = useLocation()
    const { signOut } = useAuth()
    const activeSection = navSections.find((section) => isSectionActive(section, location.pathname))
    const subPages = activeSection?.pages

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b border-border backdrop-blur-xl bg-background/85 sticky top-0 z-20">
                <div className="mx-auto flex h-[58px] w-full max-w-[1240px] items-center gap-2 px-4 sm:gap-6 sm:px-6">
                    <Link
                        to="/sessions"
                        className="flex shrink-0 items-center gap-2 rounded-[10px] font-display text-[21px] tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                    >
                        <span
                            aria-hidden="true"
                            className="inline-block size-2.5 rotate-45 rounded-[3px] bg-primary shadow-[0_0_12px_var(--glow)]"
                        />
                        CLedger
                    </Link>
                    <nav
                        aria-label="Huvudmeny"
                        className="relative isolate flex flex-1 justify-center gap-1 sm:flex-none sm:justify-start sm:gap-1"
                        style={{ "--tab-pill-anchor": "--nav-tab" } as CSSProperties}
                    >
                        {navSections.map((section) => {
                            const Icon = section.icon
                            const isActive = section === activeSection
                            return (
                                <Link
                                    key={section.label}
                                    to={section.href}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-[10px] px-3.5 py-1.5 text-sm font-medium transition-[color,transform] duration-200 active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
                                        isActive
                                            ? "tab-pill-active text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={section.label}
                                    aria-label={section.label}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    <Icon aria-hidden="true" className="h-6 w-6 sm:hidden" />
                                    <span className="hidden sm:inline">{section.label}</span>
                                </Link>
                            )
                        })}
                        {activeSection && <span aria-hidden="true" className="tab-pill" />}
                    </nav>
                    <div className="ml-auto shrink-0">
                        <button
                            type="button"
                            onClick={signOut}
                            title="Logga ut"
                            aria-label="Logga ut"
                            className="flex cursor-pointer items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-sm text-dim transition-colors hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                        >
                            <LogOut aria-hidden="true" className="size-6 sm:hidden" />
                            <span className="hidden sm:inline">Logga ut</span>
                            <span aria-hidden="true" className="hidden sm:inline">→</span>
                        </button>
                    </div>
                </div>
                {subPages && (
                    <nav
                        aria-label={`Sidor i ${activeSection.label}`}
                        className="relative isolate mx-auto flex h-11 w-full max-w-[1240px] items-center gap-1 px-4 sm:px-6"
                        style={{ "--tab-pill-anchor": "--sub-nav-tab", "--tab-pill-radius": "8px" } as CSSProperties}
                    >
                        {subPages.map((page) => {
                            const isActive = location.pathname.startsWith(page.href)
                            return (
                                <Link
                                    key={page.href}
                                    to={page.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={cn(
                                        "rounded-[8px] px-3 py-1 text-sm transition-[color,transform] duration-200 active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
                                        isActive
                                            ? "tab-pill-active text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {page.label}
                                </Link>
                            )
                        })}
                        <span aria-hidden="true" className="tab-pill" />
                    </nav>
                )}
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
