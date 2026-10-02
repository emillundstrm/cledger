import { describe, it, expect } from "vitest"
import { extractAppLinks, parseAppPath, routeFor } from "./links"

const NOTE_ID = "3f2a0000-0000-4000-8000-000000000001"
const SESSION_ID = "91bc0000-0000-4000-8000-000000000002"

describe("parseAppPath", () => {
    it("parses note and session paths", () => {
        expect(parseAppPath(`/notes/${NOTE_ID}`)).toEqual({ kind: "note", id: NOTE_ID })
        expect(parseAppPath(`/sessions/${SESSION_ID}/`)).toEqual({ kind: "session", id: SESSION_ID })
    })

    it("ignores external and unknown links", () => {
        expect(parseAppPath("https://example.com/notes/x")).toBeNull()
        expect(parseAppPath(`/other/${NOTE_ID}`)).toBeNull()
        expect(parseAppPath("/notes/not-a-uuid")).toBeNull()
    })
})

describe("extractAppLinks", () => {
    it("finds distinct links in order", () => {
        const text = `Se [axeln](/notes/${NOTE_ID}) och [passet](/sessions/${SESSION_ID}), ` +
            `samt [axeln igen](/notes/${NOTE_ID}) och [extern](https://example.com).`
        expect(extractAppLinks(text)).toEqual([
            { kind: "note", id: NOTE_ID },
            { kind: "session", id: SESSION_ID },
        ])
    })
})

describe("routeFor", () => {
    it("opens sessions in the editor", () => {
        expect(routeFor({ kind: "session", id: SESSION_ID })).toBe(`/sessions/${SESSION_ID}/edit`)
        expect(routeFor({ kind: "note", id: NOTE_ID })).toBe(`/notes/${NOTE_ID}`)
    })
})
