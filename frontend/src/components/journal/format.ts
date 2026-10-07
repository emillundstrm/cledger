import { parseISO } from "date-fns"
import { LOCALE } from "@/lib/locale"

/** A journal day in full, e.g. "fredag 2 oktober 2026". */
export function formatDay(date: string): string {
    return parseISO(date).toLocaleDateString(LOCALE, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}
