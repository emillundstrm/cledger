import type { ProtocolDefinition } from "./protocols"
import { GRIP_LABELS, HAND_LABELS, totalLoadKg } from "./protocols"
import type { RecordedSet, WorkoutConfig } from "./types"

/** Human-readable summary written into the auto-created session's notes. */
export function buildNotes(
    protocol: ProtocolDefinition,
    config: WorkoutConfig,
    sets: RecordedSet[]
): string {
    const completed = sets.filter((set) => set.completed).length
    const loads = sets.map((set) => totalLoadKg(protocol.mode, config.bodyweightKg, set.loadKg))
    const top = loads.length === 0 ? 0 : Math.max(...loads)
    const descriptor = `${GRIP_LABELS[config.grip].toLowerCase()}, ${config.edgeMm}mm, ${HAND_LABELS[config.hand].toLowerCase()}`
    return `${protocol.name} — ${descriptor}. ${completed}/${sets.length} sets completed, top load ${top}kg.`
}
