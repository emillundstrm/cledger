import type { Step } from "./timeline"

interface Cue {
    /** Seconds from the start of the step. */
    at: number
    frequency: number
    duration: number
}

/**
 * iOS routes Web Audio into the "ambient" audio session by default, and that
 * session is silenced by the physical ringer switch no matter how high the
 * volume is. Declaring "playback" opts out of that, which is why cues are
 * inaudible on an iPhone with the mute switch on until this is set.
 * Safari 16.4+, same floor as Wake Lock; ignored elsewhere.
 */
type AudioSessionType = "auto" | "playback" | "transient" | "transient-solo" | "ambient"

declare global {
    interface Navigator {
        audioSession?: { type: AudioSessionType }
    }
}

const COUNTDOWN_FREQUENCY = 660
const GO_FREQUENCY = 880
const RELEASE_FREQUENCY = 392

/**
 * Cue plan for a step, as offsets from the step's start. Work steps get a tone
 * on the pull and a lower tone on the release; everything else counts down the
 * last three seconds so the next pull is never a surprise.
 */
export function cuesForStep(step: Step): Cue[] {
    if (step.kind === "work") {
        return [
            { at: 0, frequency: GO_FREQUENCY, duration: 0.18 },
            { at: step.seconds, frequency: RELEASE_FREQUENCY, duration: 0.35 },
        ]
    }

    const cues: Cue[] = []
    for (let n = 3; n >= 1; n--) {
        const at = step.seconds - n
        if (at >= 0) {
            cues.push({ at, frequency: COUNTDOWN_FREQUENCY, duration: 0.08 })
        }
    }
    return cues
}

/**
 * Schedules audio cues on the Web Audio clock rather than with setTimeout.
 * setTimeout drifts and is throttled in background tabs; AudioContext timing is
 * sample-accurate and is set up once the context is unlocked by a user gesture,
 * which iOS requires.
 */
export class CueScheduler {
    private ctx: AudioContext | null = null
    private pending: OscillatorNode[] = []
    private muted = false

    /** Must run inside a user gesture on iOS, or no sound will ever play. */
    async unlock(): Promise<void> {
        // Must be set before the context is created to take effect reliably.
        if (navigator.audioSession !== undefined) {
            navigator.audioSession.type = "playback"
        }

        if (this.ctx === null) {
            const Ctor: typeof AudioContext =
                window.AudioContext ??
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            if (Ctor === undefined) {
                return
            }
            this.ctx = new Ctor()
        }
        if (this.ctx.state === "suspended") {
            await this.ctx.resume()
        }
    }

    /** iOS suspends the context when the page is backgrounded. */
    async resumeIfSuspended(): Promise<void> {
        if (this.ctx !== null && this.ctx.state === "suspended") {
            await this.ctx.resume()
        }
    }

    /** One audible tone, so the user can confirm cues work before hanging. */
    async test(): Promise<void> {
        await this.unlock()
        if (this.ctx === null) {
            return
        }
        this.tone(this.ctx.currentTime + 0.05, GO_FREQUENCY, 0.25)
    }

    setMuted(muted: boolean): void {
        this.muted = muted
        if (muted) {
            this.cancelPending()
        }
    }

    isMuted(): boolean {
        return this.muted
    }

    /**
     * Schedules the cues for a step. `elapsedInStep` lets cues be scheduled
     * correctly when a step is entered part-way through, such as after a pause.
     */
    scheduleStep(step: Step, elapsedInStep: number): void {
        this.cancelPending()
        if (this.ctx === null || this.muted) {
            return
        }

        const base = this.ctx.currentTime - elapsedInStep
        for (const cue of cuesForStep(step)) {
            const when = base + cue.at
            if (when >= this.ctx.currentTime) {
                this.tone(when, cue.frequency, cue.duration)
            }
        }
    }

    cancelPending(): void {
        for (const osc of this.pending) {
            try {
                osc.stop()
            } catch {
                // Already stopped; nothing to do.
            }
        }
        this.pending = []
    }

    dispose(): void {
        this.cancelPending()
        if (this.ctx !== null) {
            void this.ctx.close()
            this.ctx = null
        }
    }

    private tone(when: number, frequency: number, duration: number): void {
        if (this.ctx === null) {
            return
        }
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        osc.type = "sine"
        osc.frequency.value = frequency

        // Short attack and decay ramps, so the cue does not click.
        gain.gain.setValueAtTime(0, when)
        gain.gain.linearRampToValueAtTime(0.5, when + 0.01)
        gain.gain.setValueAtTime(0.5, when + duration - 0.02)
        gain.gain.linearRampToValueAtTime(0, when + duration)

        osc.connect(gain)
        gain.connect(this.ctx.destination)
        osc.start(when)
        osc.stop(when + duration + 0.02)

        this.pending.push(osc)
        osc.onended = () => {
            this.pending = this.pending.filter((o) => o !== osc)
        }
    }
}
