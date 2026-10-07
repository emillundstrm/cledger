import { sessionTypeLabel } from "@/api/types"

const KNOWN_TYPES = new Set(["boulder", "routes", "board", "hangboard", "strength", "rehab"])

/**
 * A session's training types as 8px dots (DESIGN.md: Training Types), at most
 * three. Decorative next to a visible type label; pass `labelled` when the
 * dots stand alone, so assistive tech hears the types.
 */
export function TypeDots({ types, labelled = false }: { types: string[]; labelled?: boolean }) {
    const shown = types.slice(0, 3)
    if (shown.length === 0) {
        return null
    }
    return (
        <span
            className="inline-flex shrink-0 items-center gap-1"
            {...(labelled
                ? { role: "img", "aria-label": shown.map((t) => sessionTypeLabel(t)).join(", ") }
                : { "aria-hidden": true })}
        >
            {shown.map((type) => (
                <span key={type} className={`type-dot dot-${KNOWN_TYPES.has(type) ? type : "other"}`} />
            ))}
        </span>
    )
}
