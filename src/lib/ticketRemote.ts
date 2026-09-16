import type { LocalStatus, TicketComment, TicketOverlay } from '../types/ticket'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { isLocalStatus } from './tickets'

export const OVERLAYS_TABLE = 'wcag_allyant_ticket_overlays'
export const COMMENTS_TABLE = 'wcag_allyant_ticket_comments'

type OverlayRow = {
  hub_id: string
  status: string
  notes: string
  updated_at: string
}

type CommentRow = {
  id: string
  hub_id: string
  body: string
  created_at: string
}

function throwIfError(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`)
}

function asOverlay(
  row: OverlayRow,
  comments: TicketComment[],
): TicketOverlay {
  const status: LocalStatus = isLocalStatus(row.status) ? row.status : 'open'
  return {
    status,
    notes: row.notes ?? '',
    comments,
    updatedAt: row.updated_at,
  }
}

export function assembleOverlays(
  overlayRows: OverlayRow[],
  commentRows: CommentRow[],
): Record<string, TicketOverlay> {
  const commentsByHub = new Map<string, TicketComment[]>()
  for (const row of commentRows) {
    const list = commentsByHub.get(row.hub_id) ?? []
    list.push({
      id: row.id,
      text: row.body,
      createdAt: row.created_at,
    })
    commentsByHub.set(row.hub_id, list)
  }

  const overlays: Record<string, TicketOverlay> = {}
  for (const row of overlayRows) {
    overlays[row.hub_id] = asOverlay(row, commentsByHub.get(row.hub_id) ?? [])
  }
  return overlays
}

export async function fetchOverlays(): Promise<Record<string, TicketOverlay>> {
  const supabase = getSupabase()
  const [overlaysResult, commentsResult] = await Promise.all([
    supabase.from(OVERLAYS_TABLE).select('hub_id, status, notes, updated_at'),
    supabase.from(COMMENTS_TABLE).select('id, hub_id, body, created_at').order('created_at'),
  ])
  throwIfError(overlaysResult.error, 'Load ticket progress')
  throwIfError(commentsResult.error, 'Load ticket comments')
  return assembleOverlays(
    (overlaysResult.data ?? []) as OverlayRow[],
    (commentsResult.data ?? []) as CommentRow[],
  )
}

export async function upsertOverlays(
  overlays: Record<string, Pick<TicketOverlay, 'status' | 'notes' | 'updatedAt'>>,
): Promise<void> {
  const rows = Object.entries(overlays).map(([hubId, overlay]) => ({
    hub_id: hubId,
    status: overlay.status,
    notes: overlay.notes,
    updated_at: overlay.updatedAt,
  }))
  if (rows.length === 0) return
  const supabase = getSupabase()
  const { error } = await supabase.from(OVERLAYS_TABLE).upsert(rows, { onConflict: 'hub_id' })
  throwIfError(error, rows.length === 1 ? 'Save ticket' : 'Save ticket status')
}

export async function upsertOverlay(
  hubId: string,
  overlay: Pick<TicketOverlay, 'status' | 'notes' | 'updatedAt'>,
): Promise<void> {
  await upsertOverlays({ [hubId]: overlay })
}

export async function insertComment(
  hubId: string,
  overlay: Pick<TicketOverlay, 'status' | 'notes' | 'updatedAt'>,
  comment: TicketComment,
): Promise<void> {
  await upsertOverlay(hubId, overlay)
  const supabase = getSupabase()
  const { error } = await supabase.from(COMMENTS_TABLE).insert({
    id: comment.id,
    hub_id: hubId,
    body: comment.text,
    created_at: comment.createdAt,
  })
  throwIfError(error, 'Save comment')
}

export async function replaceAllOverlays(
  overlays: Record<string, TicketOverlay>,
): Promise<void> {
  const supabase = getSupabase()
  const existing = await supabase.from(OVERLAYS_TABLE).select('hub_id')
  throwIfError(existing.error, 'List ticket progress')
  const hubIds = (existing.data ?? []).map((row) => row.hub_id as string)
  if (hubIds.length > 0) {
    const { error: deleteOverlaysError } = await supabase
      .from(OVERLAYS_TABLE)
      .delete()
      .in('hub_id', hubIds)
    throwIfError(deleteOverlaysError, 'Clear ticket progress')
  }

  const overlayRows = Object.entries(overlays).map(([hubId, overlay]) => ({
    hub_id: hubId,
    status: overlay.status,
    notes: overlay.notes,
    updated_at: overlay.updatedAt,
  }))
  if (overlayRows.length > 0) {
    const { error } = await supabase.from(OVERLAYS_TABLE).insert(overlayRows)
    throwIfError(error, 'Import ticket progress')
  }

  const commentRows = Object.entries(overlays).flatMap(([hubId, overlay]) =>
    overlay.comments.map((comment) => ({
      id: comment.id,
      hub_id: hubId,
      body: comment.text,
      created_at: comment.createdAt,
    })),
  )
  if (commentRows.length > 0) {
    const { error } = await supabase.from(COMMENTS_TABLE).insert(commentRows)
    throwIfError(error, 'Import comments')
  }
}

export function subscribeTicketChanges(onChange: () => void): () => void {
  if (!isSupabaseConfigured()) return () => {}
  const supabase = getSupabase()
  const channel = supabase
    .channel('wcag-allyant-tickets')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: OVERLAYS_TABLE },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: COMMENTS_TABLE },
      onChange,
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
