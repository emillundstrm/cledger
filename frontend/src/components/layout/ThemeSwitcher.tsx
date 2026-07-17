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
    { value: "light", label: "Light", dot: "oklch(0.965 0.007 85)" },
    { value: "dark", label: "Dark", dot: "oklch(0.24 0.026 255)" },
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
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-[0_10px_30px_var(--shadow)]">
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-dim">
                Theme
            </span>
            {themes.map((t) => (
                <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value)}
                    className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-full border-none px-3.5 py-1.5 text-xs font-semibold transition-colors",
                        theme === t.value
                            ? "bg-accent text-foreground"
                            : "bg-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <span
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
