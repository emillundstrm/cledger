import { LOCALE } from "@/lib/locale"

const numberFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })

/** A load or edge size in the UI locale: "32,5", never "32.5". */
export function formatNumber(value: number): string {
    return numberFormat.format(value)
}

/** "92 kg", with the decimal comma and a space before the unit. */
export function formatKg(value: number): string {
    return `${formatNumber(value)} kg`
}

/** "20 mm". */
export function formatMm(value: number): string {
    return `${formatNumber(value)} mm`
}

/** "5 okt. 2026", or "5 okt." without the year. */
export function formatDate(iso: string, withYear = true): string {
    return new Date(iso).toLocaleDateString(LOCALE, {
        day: "numeric",
        month: "short",
        year: withYear ? "numeric" : undefined,
    })
}
