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

    const isError = update.isError || archive.isError || remove.isError
    return { create, update, archive, remove, isError }
}
