import { renderHook } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { useWakeLock } from "./useWorkoutTimer"

class FakeSentinel extends EventTarget {
    released = false
    async release() {
        this.released = true
        this.dispatchEvent(new Event("release"))
    }
}

function installWakeLock() {
    const sentinels: FakeSentinel[] = []
    const request = vi.fn(async () => {
        const sentinel = new FakeSentinel()
        sentinels.push(sentinel)
        return sentinel
    })
    Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true })
    return { request, sentinels }
}

function setVisibility(state: DocumentVisibilityState) {
    Object.defineProperty(document, "visibilityState", { value: state, configurable: true })
    document.dispatchEvent(new Event("visibilitychange"))
}

describe("useWakeLock", () => {
    afterEach(() => {
        Reflect.deleteProperty(navigator, "wakeLock")
        Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
    })

    it("takes the lock again after the browser released it while hidden", async () => {
        const { request, sentinels } = installWakeLock()
        renderHook(() => useWakeLock(true))
        await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))

        // Hiding the page: the browser drops the lock on its own
        setVisibility("hidden")
        await sentinels[0].release()

        setVisibility("visible")
        await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    })
})
