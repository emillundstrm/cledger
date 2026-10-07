/** The id of a FormField's error, for the control's aria-describedby. */
export function fieldErrorId(controlId: string): string {
    return `${controlId}-error`
}
