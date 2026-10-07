import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const THEME_STORAGE_KEY = "cledger-theme"

type Theme = "light" | "dark"

function getStoredTheme(): Theme {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
        if (stored === "light" || stored === "dark") {
            return stored
        }
    } catch {
        // localStorage unavailable
    }
    return "dark"
}

const themes: { value: Theme; label: string; dot: string }[] = [
    { value: "light", label: "Ljust", dot: "var(--swatch-chalk)" },
    { value: "dark", label: "Mörkt", dot: "var(--swatch-slate)" },
]

function ThemeSwitcher() {
    const [theme, setTheme] = useState<Theme>(getStoredTheme)

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark")
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme)
        } catch {
            // localStorage unavailable
        }
    }, [theme])

    return (
        <div role="group" aria-label="Tema" className="fixed bottom-5 right-5 z-50 flex items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-float">
            <span aria-hidden="true" className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-dim">
                Tema
            </span>
            {themes.map((t) => (
                <button
                    key={t.value}
                    type="button"
                    aria-pressed={theme === t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-full border-none px-3.5 py-1.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
                        theme === t.value
                            ? "bg-accent text-foreground"
                            : "bg-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <span
                        aria-hidden="true"
                        className="inline-block size-2 rounded-full border border-border"
                        style={{ background: t.dot }}
                    />
                    {t.label}
                </button>
            ))}
        </div>
    )
}

export default ThemeSwitcher
