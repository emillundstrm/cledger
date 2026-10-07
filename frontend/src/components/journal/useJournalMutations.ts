import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
    createJournalEntry,
    deleteJournalEntry,
    setJournalEntryArchived,
    updateJournalEntry,
} from "@/api/journal"
import type { JournalEntryRequest } from "@/api/types"

export function useJournalMutations(onDeleted?: () => void) {
    const queryClient = useQueryClient()
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["journal"] })
        queryClient.invalidateQueries({ queryKey: ["journal-entry"] })
        queryClient.invalidateQueries({ queryKey: ["search"] })
    }

    const create = useMutation({
        mutationFn: (data: JournalEntryRequest) => createJournalEntry(data),
        onSuccess: invalidate,
    })
    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: JournalEntryRequest }) => updateJournalEntry(id, data),
        onSuccess: invalidate,
    })
    const archive = useMutation({
        mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setJournalEntryArchived(id, archived),
        onSuccess: invalidate,
    })
    const remove = useMutation({
        mutationFn: (id: string) => deleteJournalEntry(id),
        onSuccess: () => {
            invalidate()
            onDeleted?.()
        },
    })

    /** Whether the last edit, archive or delete of this entry failed, so the error shows by the entry. */
    const failedFor = (id: string) =>
        (update.isError && update.variables?.id === id) ||
        (archive.isError && archive.variables?.id === id) ||
        (remove.isError && remove.variables === id)

    return { create, update, archive, remove, failedFor }
}
