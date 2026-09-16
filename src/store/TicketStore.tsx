import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { LOCAL_STORE_KEY } from '../constants/shellLayout'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import {
  fetchOverlays,
  deleteComment as deleteCommentRemote,
  insertComment,
  replaceAllOverlays,
  subscribeTicketChanges,
  upsertOverlays,
} from '../lib/ticketRemote'
import { mergeTickets, relatedHubIds } from '../lib/tickets'
import type { LocalStatus, Ticket, TicketComment, TicketOverlay } from '../types/ticket'

const MIGRATED_KEY = 'wcag-allyant-supabase-migrated-v1'

type StoreShape = {
  version: 1
  tickets: Record<string, TicketOverlay>
}

type TicketStoreValue = {
  tickets: Ticket[]
  overlays: Record<string, TicketOverlay>
  ready: boolean
  syncError: string | null
  getTicket: (hubId: string) => Ticket | undefined
  setStatus: (hubId: string, status: LocalStatus) => void
  setNotes: (hubId: string, notes: string) => void
  addComment: (hubId: string, text: string, author: string) => void
  deleteComment: (hubId: string, commentId: string) => void
  exportProgress: () => string
  importProgress: (json: string) => void
  resetProgress: () => void
}

const TicketStoreContext = createContext<TicketStoreValue | null>(null)

function emptyStore(): StoreShape {
  return { version: 1, tickets: {} }
}

function loadLocalStore(): StoreShape {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as StoreShape
    if (parsed?.version !== 1 || typeof parsed.tickets !== 'object' || !parsed.tickets) {
      return emptyStore()
    }
    for (const overlay of Object.values(parsed.tickets)) {
      overlay.comments = (overlay.comments ?? []).map((comment) => ({
        ...comment,
        author: comment.author ?? '',
      }))
    }
    return parsed
  } catch {
    return emptyStore()
  }
}

function cacheLocal(overlays: Record<string, TicketOverlay>): void {
  localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify({ version: 1, tickets: overlays }))
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

function messageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not sync with Supabase.'
}

export function TicketStoreProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Record<string, TicketOverlay>>(
    () => loadLocalStore().tickets,
  )
  const [ready, setReady] = useState(!isSupabaseConfigured())
  const [syncError, setSyncError] = useState<string | null>(
    isSupabaseConfigured()
      ? null
      : 'Supabase is not configured. Progress is staying in this browser only.',
  )
  const overlaysRef = useRef(overlays)
  const skipRealtimeRef = useRef(0)

  useEffect(() => {
    overlaysRef.current = overlays
  }, [overlays])

  const hydrateFromRemote = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setReady(true)
      return
    }
    try {
      const remote = await fetchOverlays()
      const local = loadLocalStore().tickets
      const migrated = localStorage.getItem(MIGRATED_KEY) === '1'
      if (Object.keys(remote).length === 0 && Object.keys(local).length > 0 && !migrated) {
        await replaceAllOverlays(local)
        localStorage.setItem(MIGRATED_KEY, '1')
        cacheLocal(local)
        setOverlays(local)
      } else {
        localStorage.setItem(MIGRATED_KEY, '1')
        cacheLocal(remote)
        setOverlays(remote)
      }
      setSyncError(null)
    } catch (error) {
      setSyncError(messageFromUnknown(error))
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void hydrateFromRemote()
  }, [hydrateFromRemote])

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined
    let debounce: number | undefined
    const unsubscribe = subscribeTicketChanges(() => {
      if (skipRealtimeRef.current > 0) return
      window.clearTimeout(debounce)
      debounce = window.setTimeout(() => {
        void hydrateFromRemote()
      }, 200)
    })
    return () => {
      window.clearTimeout(debounce)
      unsubscribe()
    }
  }, [hydrateFromRemote])

  const persistOverlays = useCallback(
    async (
      patch: Record<string, TicketOverlay>,
      extra?:
        | { hubId: string; comment: TicketComment }
        | { hubId: string; deleteCommentId: string },
    ) => {
      const previous = overlaysRef.current
      const next = { ...previous, ...patch }
      skipRealtimeRef.current += 1
      setOverlays(next)
      cacheLocal(next)
      try {
        if (isSupabaseConfigured()) {
          if (extra && 'comment' in extra) {
            await insertComment(extra.hubId, patch[extra.hubId], extra.comment)
          } else if (extra && 'deleteCommentId' in extra) {
            await deleteCommentRemote(extra.hubId, patch[extra.hubId], extra.deleteCommentId)
          } else {
            await upsertOverlays(patch)
          }
          setSyncError(null)
        }
      } catch (error) {
        setOverlays(previous)
        cacheLocal(previous)
        setSyncError(messageFromUnknown(error))
      } finally {
        window.setTimeout(() => {
          skipRealtimeRef.current = Math.max(0, skipRealtimeRef.current - 1)
        }, 400)
      }
    },
    [],
  )

  const commitOverlay = useCallback(
    async (
      hubId: string,
      nextOverlay: TicketOverlay,
      extra?: { comment?: TicketComment; deleteCommentId?: string },
    ) => {
      await persistOverlays(
        { [hubId]: nextOverlay },
        extra?.comment
          ? { hubId, comment: extra.comment }
          : extra?.deleteCommentId
            ? { hubId, deleteCommentId: extra.deleteCommentId }
            : undefined,
      )
    },
    [persistOverlays],
  )

  const tickets = useMemo(() => mergeTickets(overlays), [overlays])

  const getTicket = useCallback(
    (hubId: string) => tickets.find((ticket) => ticket.hubId === hubId),
    [tickets],
  )

  const setStatus = useCallback(
    (hubId: string, status: LocalStatus) => {
      const current = overlaysRef.current
      const stamp = new Date().toISOString()
      const patch: Record<string, TicketOverlay> = {}
      for (const relatedId of relatedHubIds(hubId)) {
        patch[relatedId] = {
          ...overlayFor(current[relatedId], { status }),
          updatedAt: stamp,
        }
      }
      void persistOverlays(patch)
    },
    [persistOverlays],
  )

  const setNotes = useCallback(
    (hubId: string, notes: string) => {
      void commitOverlay(hubId, overlayFor(overlaysRef.current[hubId], { notes }))
    },
    [commitOverlay],
  )

  const addComment = useCallback(
    (hubId: string, text: string, author: string) => {
      const trimmed = text.trim()
      const trimmedAuthor = author.trim()
      if (!trimmed || !trimmedAuthor) return
      const comment: TicketComment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        author: trimmedAuthor,
        text: trimmed,
        createdAt: new Date().toISOString(),
      }
      const current = overlaysRef.current[hubId]
      void commitOverlay(
        hubId,
        overlayFor(current, {
          comments: [...(current?.comments ?? []), comment],
        }),
        { comment },
      )
    },
    [commitOverlay],
  )

  const deleteComment = useCallback(
    (hubId: string, commentId: string) => {
      const current = overlaysRef.current[hubId]
      if (!current) return
      void commitOverlay(
        hubId,
        overlayFor(current, {
          comments: current.comments.filter((comment) => comment.id !== commentId),
        }),
        { deleteCommentId: commentId },
      )
    },
    [commitOverlay],
  )

  const exportProgress = useCallback(
    () => JSON.stringify({ version: 1, tickets: overlays }, null, 2),
    [overlays],
  )

  const importProgress = useCallback((json: string) => {
    const parsed = JSON.parse(json) as StoreShape
    if (parsed?.version !== 1 || typeof parsed.tickets !== 'object') {
      throw new Error('Invalid progress file')
    }
    const previous = overlaysRef.current
    skipRealtimeRef.current += 1
    setOverlays(parsed.tickets)
    cacheLocal(parsed.tickets)
    void (async () => {
      try {
        if (isSupabaseConfigured()) {
          await replaceAllOverlays(parsed.tickets)
          localStorage.setItem(MIGRATED_KEY, '1')
        }
        setSyncError(null)
      } catch (error) {
        setOverlays(previous)
        cacheLocal(previous)
        setSyncError(messageFromUnknown(error))
      } finally {
        window.setTimeout(() => {
          skipRealtimeRef.current = Math.max(0, skipRealtimeRef.current - 1)
        }, 400)
      }
    })()
  }, [])

  const resetProgress = useCallback(() => {
    const previous = overlaysRef.current
    skipRealtimeRef.current += 1
    setOverlays({})
    cacheLocal({})
    void (async () => {
      try {
        if (isSupabaseConfigured()) {
          await replaceAllOverlays({})
          localStorage.setItem(MIGRATED_KEY, '1')
        }
        setSyncError(null)
      } catch (error) {
        setOverlays(previous)
        cacheLocal(previous)
        setSyncError(messageFromUnknown(error))
      } finally {
        window.setTimeout(() => {
          skipRealtimeRef.current = Math.max(0, skipRealtimeRef.current - 1)
        }, 400)
      }
    })()
  }, [])

  const value = useMemo<TicketStoreValue>(
    () => ({
      tickets,
      overlays,
      ready,
      syncError,
      getTicket,
      setStatus,
      setNotes,
      addComment,
      deleteComment,
      exportProgress,
      importProgress,
      resetProgress,
    }),
    [
      tickets,
      overlays,
      ready,
      syncError,
      getTicket,
      setStatus,
      setNotes,
      addComment,
      deleteComment,
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
