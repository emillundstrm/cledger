import type { ProtocolDefinition } from "./protocols"
import { GRIP_LABELS, HAND_MODE_LABELS, totalLoadKg } from "./protocols"
import type { RecordedSet, WorkoutConfig } from "./types"

/** Human-readable summary written into the auto-created session's notes. */
export function buildNotes(
    protocol: ProtocolDefinition,
    config: WorkoutConfig,
    sets: RecordedSet[]
): string {
    const completed = sets.filter((set) => set.completed)
    // Top load means the heaviest you actually held — a missed attempt is not
    // an achievement, so it must not be reported as one.
    const loads = completed.map((set) => totalLoadKg(config.mode, config.bodyweightKg, set.loadKg))
    const top = loads.length === 0 ? 0 : Math.max(...loads)
    const descriptor = `${GRIP_LABELS[config.grip].toLowerCase()}, ${config.edgeMm}mm, ${HAND_MODE_LABELS[config.handMode].toLowerCase()}`
    return `${protocol.name} — ${descriptor}. ${completed.length}/${sets.length} sets completed, top load ${top}kg.`
}
