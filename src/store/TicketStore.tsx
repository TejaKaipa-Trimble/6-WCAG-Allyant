import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { LOCAL_STORE_KEY } from '../constants/shellLayout'
import { mergeTickets } from '../lib/tickets'
import type { LocalStatus, Ticket, TicketComment, TicketOverlay } from '../types/ticket'

type StoreShape = {
  version: 1
  tickets: Record<string, TicketOverlay>
}

type TicketStoreValue = {
  tickets: Ticket[]
  overlays: Record<string, TicketOverlay>
  getTicket: (hubId: string) => Ticket | undefined
  setStatus: (hubId: string, status: LocalStatus) => void
  setNotes: (hubId: string, notes: string) => void
  addComment: (hubId: string, text: string) => void
  exportProgress: () => string
  importProgress: (json: string) => void
  resetProgress: () => void
}

const TicketStoreContext = createContext<TicketStoreValue | null>(null)

function emptyStore(): StoreShape {
  return { version: 1, tickets: {} }
}

function loadStore(): StoreShape {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as StoreShape
    if (parsed?.version !== 1 || typeof parsed.tickets !== 'object' || !parsed.tickets) {
      return emptyStore()
    }
    return parsed
  } catch {
    return emptyStore()
  }
}

function persist(store: StoreShape): void {
  localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store))
}

function overlayFor(
  current: TicketOverlay | undefined,
  patch: Partial<TicketOverlay>,
): TicketOverlay {
  return {
    status: patch.status ?? current?.status ?? 'open',
    notes: patch.notes ?? current?.notes ?? '',
    comments: patch.comments ?? current?.comments ?? [],
    updatedAt: new Date().toISOString(),
  }
}

export function TicketStoreProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Record<string, TicketOverlay>>(
    () => loadStore().tickets,
  )

  const commit = useCallback((next: Record<string, TicketOverlay>) => {
    setOverlays(next)
    persist({ version: 1, tickets: next })
  }, [])

  const tickets = useMemo(() => mergeTickets(overlays), [overlays])

  const getTicket = useCallback(
    (hubId: string) => tickets.find((ticket) => ticket.hubId === hubId),
    [tickets],
  )

  const setStatus = useCallback(
    (hubId: string, status: LocalStatus) => {
      commit({
        ...overlays,
        [hubId]: overlayFor(overlays[hubId], { status }),
      })
    },
    [commit, overlays],
  )

  const setNotes = useCallback(
    (hubId: string, notes: string) => {
      commit({
        ...overlays,
        [hubId]: overlayFor(overlays[hubId], { notes }),
      })
    },
    [commit, overlays],
  )

  const addComment = useCallback(
    (hubId: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const comment: TicketComment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: trimmed,
        createdAt: new Date().toISOString(),
      }
      const current = overlays[hubId]
      commit({
        ...overlays,
        [hubId]: overlayFor(current, {
          comments: [...(current?.comments ?? []), comment],
        }),
      })
    },
    [commit, overlays],
  )

  const exportProgress = useCallback(
    () => JSON.stringify({ version: 1, tickets: overlays }, null, 2),
    [overlays],
  )

  const importProgress = useCallback(
    (json: string) => {
      const parsed = JSON.parse(json) as StoreShape
      if (parsed?.version !== 1 || typeof parsed.tickets !== 'object') {
        throw new Error('Invalid progress file')
      }
      commit(parsed.tickets)
    },
    [commit],
  )

  const resetProgress = useCallback(() => {
    commit({})
  }, [commit])

  const value = useMemo<TicketStoreValue>(
    () => ({
      tickets,
      overlays,
      getTicket,
      setStatus,
      setNotes,
      addComment,
      exportProgress,
      importProgress,
      resetProgress,
    }),
    [
      tickets,
      overlays,
      getTicket,
      setStatus,
      setNotes,
      addComment,
      exportProgress,
      importProgress,
      resetProgress,
    ],
  )

  return <TicketStoreContext.Provider value={value}>{children}</TicketStoreContext.Provider>
}

export function useTicketStore(): TicketStoreValue {
  const value = useContext(TicketStoreContext)
  if (!value) throw new Error('useTicketStore must be used inside TicketStoreProvider')
  return value
}
