import { differenceInCalendarDays, format, parseISO } from "date-fns"

/** Today's date in the user's time zone, as YYYY-MM-DD. */
export function todayLocal(): string {
    return format(new Date(), "yyyy-MM-dd")
}

/** Calendar days from today to a YYYY-MM-DD date; negative if it is in the past. */
export function daysFromToday(date: string): number {
    return differenceInCalendarDays(parseISO(date), new Date())
}

/** YYYY-MM-DD `days` days before today. */
export function daysAgoLocal(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return format(d, "yyyy-MM-dd")
}
