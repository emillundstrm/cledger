// Checklists are GitHub-style Markdown task lines inside a note:
// "- [ ] kaffefilter" and "- [x] kaffe". A checklist is a run of consecutive
// task lines. Mirrored in supabase/functions/mcp/checklist.ts.

const TASK_LINE = /^(\s*[-*+] )\[( |x|X)\] (.*)$/

export interface ChecklistItem {
    /** Zero-based line index in the content. */
    line: number
    checked: boolean
    text: string
}

function parseLine(line: string): { prefix: string; checked: boolean; text: string } | null {
    const match = TASK_LINE.exec(line)
    if (!match) {
        return null
    }
    return { prefix: match[1], checked: match[2] !== " ", text: match[3] }
}

export function checklistItems(content: string): ChecklistItem[] {
    const items: ChecklistItem[] = []
    content.split("\n").forEach((line, index) => {
        const parsed = parseLine(line)
        if (parsed) {
            items.push({ line: index, checked: parsed.checked, text: parsed.text })
        }
    })
    return items
}

export function openItems(content: string): ChecklistItem[] {
    return checklistItems(content).filter((item) => !item.checked)
}

/** First and last line index of the checklist containing `line`. */
function blockAround(lines: string[], line: number): [number, number] {
    let start = line
    while (start > 0 && parseLine(lines[start - 1])) {
        start--
    }
    let end = line
    while (end < lines.length - 1 && parseLine(lines[end + 1])) {
        end++
    }
    return [start, end]
}

/** Where an open item belongs in a block: after the last open item, before the ticked ones. */
function openInsertIndex(lines: string[], start: number, end: number): number {
    for (let i = start; i <= end; i++) {
        if (parseLine(lines[i])?.checked) {
            return i
        }
    }
    return end + 1
}

/**
 * Tick or untick the item on `line`. A ticked item moves to the bottom of its
 * checklist and an unticked one back above the ticked items, so open items stay
 * on top. Nested checklists (mixed indentation) are toggled in place.
 */
export function setItemChecked(content: string, line: number, checked: boolean): string {
    const lines = content.split("\n")
    const parsed = parseLine(lines[line] ?? "")
    if (!parsed || parsed.checked === checked) {
        return content
    }

    const updated = `${parsed.prefix}[${checked ? "x" : " "}] ${parsed.text}`
    const [start, end] = blockAround(lines, line)
    const flat = lines.slice(start, end + 1).every((l) => parseLine(l)?.prefix === parsed.prefix)
    if (!flat) {
        lines[line] = updated
        return lines.join("\n")
    }

    lines.splice(line, 1)
    const blockEnd = end - 1
    const target = checked ? blockEnd + 1 : openInsertIndex(lines, start, blockEnd)
    lines.splice(target, 0, updated)
    return lines.join("\n")
}

/** Add an open item to the note's last checklist, or start a checklist at the end. */
export function addItem(content: string, text: string): string {
    const clean = text.trim()
    if (clean === "") {
        return content
    }

    const lines = content.split("\n")
    let last = -1
    for (let i = lines.length - 1; i >= 0; i--) {
        if (parseLine(lines[i])) {
            last = i
            break
        }
    }

    if (last === -1) {
        const body = content.trimEnd()
        return body === "" ? `- [ ] ${clean}` : `${body}\n\n- [ ] ${clean}`
    }

    const [start, end] = blockAround(lines, last)
    const prefix = parseLine(lines[start])!.prefix
    lines.splice(openInsertIndex(lines, start, end), 0, `${prefix}[ ] ${clean}`)
    return lines.join("\n")
}
