import { describe, it, expect } from "vitest"
import { addItem, checklistItems, openItems, setItemChecked } from "./checklist"

const SHOPPING = ["Till helgen:", "", "- [ ] kaffefilter", "- [ ] kaffe", "- [x] mjölk", "", "Glöm inte påsar."].join("\n")

describe("checklistItems", () => {
    it("finds ticked and open items with their lines", () => {
        expect(checklistItems(SHOPPING)).toEqual([
            { line: 2, checked: false, text: "kaffefilter" },
            { line: 3, checked: false, text: "kaffe" },
            { line: 4, checked: true, text: "mjölk" },
        ])
        expect(openItems(SHOPPING).map((i) => i.text)).toEqual(["kaffefilter", "kaffe"])
    })

    it("accepts * and + bullets and capital X", () => {
        expect(checklistItems("* [X] a\n+ [ ] b").map((i) => i.checked)).toEqual([true, false])
    })
})

describe("setItemChecked", () => {
    it("moves a ticked item below the open ones", () => {
        const result = setItemChecked(SHOPPING, 2, true)
        expect(result.split("\n").slice(2, 5)).toEqual(["- [ ] kaffe", "- [x] mjölk", "- [x] kaffefilter"])
    })

    it("moves an unticked item back above the ticked ones", () => {
        const result = setItemChecked(SHOPPING, 4, false)
        expect(result.split("\n").slice(2, 5)).toEqual(["- [ ] kaffefilter", "- [ ] kaffe", "- [ ] mjölk"])
    })

    it("leaves the rest of the note untouched", () => {
        const result = setItemChecked(SHOPPING, 3, true)
        expect(result.split("\n")[0]).toBe("Till helgen:")
        expect(result.split("\n")[6]).toBe("Glöm inte påsar.")
    })

    it("toggles nested items in place", () => {
        const nested = "- [ ] steg 1\n  - [ ] delsteg\n- [ ] steg 2"
        expect(setItemChecked(nested, 0, true)).toBe("- [x] steg 1\n  - [ ] delsteg\n- [ ] steg 2")
    })

    it("ignores lines that are not items, and no-op toggles", () => {
        expect(setItemChecked(SHOPPING, 0, true)).toBe(SHOPPING)
        expect(setItemChecked(SHOPPING, 4, true)).toBe(SHOPPING)
    })
})

describe("addItem", () => {
    it("adds after the last open item of the last checklist", () => {
        const result = addItem(SHOPPING, " bröd ")
        expect(result.split("\n").slice(2, 6)).toEqual(["- [ ] kaffefilter", "- [ ] kaffe", "- [ ] bröd", "- [x] mjölk"])
    })

    it("starts a checklist in a note without one", () => {
        expect(addItem("Filmer att se", "Dune")).toBe("Filmer att se\n\n- [ ] Dune")
        expect(addItem("", "Dune")).toBe("- [ ] Dune")
    })

    it("ignores blank items", () => {
        expect(addItem(SHOPPING, "  ")).toBe(SHOPPING)
    })
})
