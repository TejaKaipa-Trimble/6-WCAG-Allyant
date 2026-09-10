import issuesJson from '../data/issues.json'
import {
  matchModusCatalog,
  modusParentId,
  OTHER_MODUS_SLUG,
  OTHER_MODUS_TITLE,
} from './modusCatalog'
import type { AuditIssue, LocalStatus, Ticket, TicketFilters, TicketOverlay } from '../types/ticket'
import { EMPTY_FILTERS } from '../types/ticket'

const AUDIT_ISSUES = issuesJson as AuditIssue[]

export function mergeTicket(issue: AuditIssue, overlay?: TicketOverlay): Ticket {
  return {
    ...issue,
    status: overlay?.status ?? 'open',
    notes: overlay?.notes ?? '',
    comments: overlay?.comments ?? [],
    updatedAt: overlay?.updatedAt ?? null,
  }
}

export function mergeTickets(
  overlays: Record<string, TicketOverlay>,
): Ticket[] {
  return AUDIT_ISSUES.map((issue) => mergeTicket(issue, overlays[issue.hubId]))
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function filterTickets(tickets: Ticket[], filters: TicketFilters): Ticket[] {
  const query = filters.q.trim().toLowerCase()
  return tickets.filter((ticket) => {
    if (filters.pageName && ticket.pageName !== filters.pageName) return false
    if (filters.component === '__none__') {
      if (ticket.component) return false
    } else if (filters.component && ticket.component !== filters.component) {
      return false
    }
    if (filters.priority && ticket.priority !== filters.priority) return false
    if (filters.category && ticket.category !== filters.category) return false
    if (filters.status && ticket.status !== filters.status) return false
    if (filters.highRisk && !ticket.highRisk) return false
    if (filters.sitewide && !ticket.sitewide) return false
    if (!query) return true
    const haystack = [
      ticket.hubId,
      ticket.pageName,
      ticket.component,
      ticket.description,
      ticket.affectedItem,
      ticket.wcag,
      ticket.category,
      ticket.recommendedFix,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
}

export function ticketsToSearchParams(filters: TicketFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.pageName) params.set('page', filters.pageName)
  if (filters.component) params.set('component', filters.component)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.category) params.set('category', filters.category)
  if (filters.status) params.set('status', filters.status)
  if (filters.highRisk) params.set('highRisk', 'yes')
  if (filters.sitewide) params.set('sitewide', 'yes')
  return params
}

export function ticketsPath(filters: TicketFilters): string {
  const params = ticketsToSearchParams(filters)
  const query = params.toString()
  return query ? `/tickets?${query}` : '/tickets'
}

export function filtersFromSearch(search: string): TicketFilters {
  const params = new URLSearchParams(search)
  return {
    ...EMPTY_FILTERS,
    q: params.get('q') ?? '',
    pageName: params.get('page') ?? '',
    component: params.get('component') ?? '',
    priority: params.get('priority') ?? '',
    category: params.get('category') ?? '',
    status: params.get('status') ?? '',
    highRisk: params.get('highRisk') === 'yes',
    sitewide: params.get('sitewide') === 'yes',
  }
}

export function isLocalStatus(value: string): value is LocalStatus {
  return value === 'open' || value === 'in_progress' || value === 'resolved' || value === 'wont_fix'
}

export const UNSPECIFIED_COMPONENT = '__none__'

export type ComponentSort = 'name' | 'remaining'

export type ComponentPageExtras = {
  selected: string
  remainingOnly: boolean
  sort: ComponentSort
}

export const EMPTY_COMPONENT_EXTRAS: ComponentPageExtras = {
  selected: '',
  remainingOnly: false,
  sort: 'remaining',
}

export type ComponentGroup = {
  key: string
  label: string
  tickets: Ticket[]
  total: number
  remaining: number
  open: number
  inProgress: number
  resolved: number
  critical: number
  highRisk: number
  pages: string[]
  categories: string[]
}

export function componentKey(name: string): string {
  return name.trim() ? name : UNSPECIFIED_COMPONENT
}

export function componentLabel(key: string): string {
  return key === UNSPECIFIED_COMPONENT ? 'Unspecified' : key
}

export function isRemainingTicket(ticket: Ticket): boolean {
  return ticket.status !== 'resolved' && ticket.status !== 'wont_fix'
}

export function groupTicketsByComponent(tickets: Ticket[]): ComponentGroup[] {
  const buckets = new Map<string, Ticket[]>()
  for (const ticket of tickets) {
    const key = componentKey(ticket.component)
    const list = buckets.get(key)
    if (list) list.push(ticket)
    else buckets.set(key, [ticket])
  }

  return [...buckets.entries()].map(([key, list]) => {
    const remainingTickets = list.filter(isRemainingTicket)
    return {
      key,
      label: componentLabel(key),
      tickets: list,
      total: list.length,
      remaining: remainingTickets.length,
      open: list.filter((ticket) => ticket.status === 'open').length,
      inProgress: list.filter((ticket) => ticket.status === 'in_progress').length,
      resolved: list.filter((ticket) => ticket.status === 'resolved').length,
      critical: remainingTickets.filter((ticket) => ticket.priority === 'Critical').length,
      highRisk: remainingTickets.filter((ticket) => ticket.highRisk).length,
      pages: uniqueSorted(list.map((ticket) => ticket.pageName)),
      categories: uniqueSorted(list.map((ticket) => ticket.category)),
    }
  })
}

export function sortComponentGroups(
  groups: ComponentGroup[],
  sort: ComponentSort,
): ComponentGroup[] {
  const copy = [...groups]
  if (sort === 'name') {
    return copy.sort((a, b) => {
      if (a.key === UNSPECIFIED_COMPONENT) return 1
      if (b.key === UNSPECIFIED_COMPONENT) return -1
      return a.label.localeCompare(b.label)
    })
  }
  return copy.sort(
    (a, b) => b.remaining - a.remaining || b.total - a.total || a.label.localeCompare(b.label),
  )
}

export type ModusComponentBranch = {
  slug: string
  title: string
  id: string
  children: ComponentGroup[]
  total: number
  remaining: number
}

export function groupComponentGroupsByModus(
  groups: ComponentGroup[],
  sort: ComponentSort,
): ModusComponentBranch[] {
  const buckets = new Map<string, { title: string; children: ComponentGroup[] }>()
  for (const group of groups) {
    const label = group.key === UNSPECIFIED_COMPONENT ? '' : group.label
    const parent = matchModusCatalog(label)
    const current = buckets.get(parent.slug)
    if (current) current.children.push(group)
    else buckets.set(parent.slug, { title: parent.title, children: [group] })
  }

  const branches: ModusComponentBranch[] = [...buckets.entries()].map(([slug, bucket]) => {
    const children = sortComponentGroups(bucket.children, sort)
    return {
      slug,
      title: slug === OTHER_MODUS_SLUG ? OTHER_MODUS_TITLE : bucket.title,
      id: modusParentId(slug),
      children,
      total: children.reduce((sum, child) => sum + child.total, 0),
      remaining: children.reduce((sum, child) => sum + child.remaining, 0),
    }
  })

  const ranked = [...branches]
  if (sort === 'name') {
    ranked.sort((a, b) => {
      if (a.slug === OTHER_MODUS_SLUG) return 1
      if (b.slug === OTHER_MODUS_SLUG) return -1
      return a.title.localeCompare(b.title)
    })
  } else {
    ranked.sort((a, b) => {
      if (a.slug === OTHER_MODUS_SLUG) return 1
      if (b.slug === OTHER_MODUS_SLUG) return -1
      return b.remaining - a.remaining || b.total - a.total || a.title.localeCompare(b.title)
    })
  }
  return ranked
}

export function findModusBranchForGroup(
  branches: ModusComponentBranch[],
  groupKey: string,
): ModusComponentBranch | undefined {
  return branches.find((branch) => branch.children.some((child) => child.key === groupKey))
}

export function componentsPath(filters: TicketFilters, extras: ComponentPageExtras): string {
  const params = ticketsToSearchParams({ ...filters, component: '' })
  if (extras.selected) params.set('selected', extras.selected)
  if (extras.remainingOnly) params.set('remaining', 'yes')
  if (extras.sort === 'name') params.set('sort', 'name')
  const query = params.toString()
  return query ? `/components?${query}` : '/components'
}

export function componentExtrasFromSearch(search: string): ComponentPageExtras {
  const params = new URLSearchParams(search)
  return {
    selected: params.get('selected') ?? '',
    remainingOnly: params.get('remaining') === 'yes',
    sort: params.get('sort') === 'name' ? 'name' : 'remaining',
  }
}
