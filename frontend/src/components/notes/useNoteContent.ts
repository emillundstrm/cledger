import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { updateNoteContent } from "@/api/notes"
import type { Note } from "@/api/types"

const MUTATION_KEY = ["note-content"]

/** The freshest content we hold for a note: its own page's cache, else any notes list. */
function cachedContent(queryClient: QueryClient, id: string): string | undefined {
    const single = queryClient.getQueryData<Note>(["note", id])
    if (single) {
        return single.content
    }
    for (const [, notes] of queryClient.getQueriesData<Note[]>({ queryKey: ["notes"] })) {
        const note = notes?.find((n) => n.id === id)
        if (note) {
            return note.content
        }
    }
    return undefined
}

function setCachedContent(queryClient: QueryClient, id: string, content: string) {
    queryClient.setQueryData<Note>(["note", id], (old) => (old ? { ...old, content } : old))
    queryClient.setQueriesData<Note[]>({ queryKey: ["notes"] }, (old) =>
        old?.map((n) => (n.id === id ? { ...n, content } : n)),
    )
}

/**
 * Checklist edits (tick, add) on any note. Changes show at once in both the
 * note page and the notes list, and save in the background one at a time and
 * in order, so quick taps cannot overwrite each other.
 */
export function useNoteContent() {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationKey: MUTATION_KEY,
        mutationFn: ({ id, content }: { id: string; content: string }) => updateNoteContent(id, content),
        scope: { id: "note-content" },
        onMutate: async ({ id, content }) => {
            await queryClient.cancelQueries({ queryKey: ["note", id] })
            await queryClient.cancelQueries({ queryKey: ["notes"] })
            setCachedContent(queryClient, id, content)
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            queryClient.invalidateQueries({ queryKey: ["note"] })
        },
        onSuccess: () => {
            // Refetch only once the queue is drained; earlier refetches would
            // briefly show content from before the later taps.
            if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
                queryClient.invalidateQueries({ queryKey: ["notes"] })
                queryClient.invalidateQueries({ queryKey: ["search"] })
            }
        },
    })

    const change = (id: string, edit: (content: string) => string) => {
        const current = cachedContent(queryClient, id)
        if (current === undefined) {
            return
        }
        const next = edit(current)
        if (next !== current) {
            mutation.mutate({ id, content: next })
        }
    }

    return { change, isError: mutation.isError }
}
