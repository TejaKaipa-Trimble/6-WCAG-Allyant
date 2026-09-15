import issuesJson from '../data/issues.json'
import {
  isModusParentId,
  matchModusCatalog,
  MODUS_CATALOG,
  MODUS_PARENT_PREFIX,
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
    } else if (filters.component) {
      if (isModusParentId(filters.component)) {
        const slug = filters.component.slice(MODUS_PARENT_PREFIX.length)
        if (matchModusCatalog(ticket.component).slug !== slug) return false
      } else if (ticket.component !== filters.component) {
        return false
      }
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

export type BreadcrumbItem = { label: string; url?: string }

export function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

export function resolveBackPath(returnTo?: string | null): string {
  return safeReturnTo(returnTo ?? null) ?? '/tickets'
}

export function ticketDetailPath(hubId: string, returnTo?: string | null): string {
  const safe = safeReturnTo(returnTo ?? null)
  if (!safe) return `/tickets/${hubId}`
  return `/tickets/${hubId}?returnTo=${encodeURIComponent(safe)}`
}

function splitPathQuery(path: string): { pathname: string; params: URLSearchParams } {
  const index = path.indexOf('?')
  if (index === -1) return { pathname: path, params: new URLSearchParams() }
  return { pathname: path.slice(0, index), params: new URLSearchParams(path.slice(index + 1)) }
}

function joinPathQuery(pathname: string, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function buildTicketDetailCrumbs(
  ticket: { hubId: string; pageName: string; component?: string },
  returnTo?: string | null,
): BreadcrumbItem[] {
  const safe = safeReturnTo(returnTo ?? null)

  if (safe?.startsWith('/components')) {
    const { pathname, params } = splitPathQuery(safe)
    const selectedKey =
      params.get('selected')?.trim() ||
      modusParentId(matchModusCatalog(ticket.component ?? '').slug)
    const itemLabel = componentLabel(selectedKey)

    const listParams = new URLSearchParams(params)
    listParams.delete('selected')
    const selectedParams = new URLSearchParams(params)
    if (selectedKey) selectedParams.set('selected', selectedKey)

    const crumbs: BreadcrumbItem[] = [{ label: 'Components', url: joinPathQuery(pathname, listParams) }]
    if (itemLabel) crumbs.push({ label: itemLabel, url: joinPathQuery(pathname, selectedParams) })
    crumbs.push({ label: `HUB ${ticket.hubId}` })
    return crumbs
  }

  if (safe?.startsWith('/pages')) {
    return [
      { label: 'Pages', url: safe },
      { label: ticket.pageName },
      { label: `HUB ${ticket.hubId}` },
    ]
  }

  if (safe?.startsWith('/tickets')) {
    return [
      { label: 'Tickets', url: safe },
      { label: ticket.pageName, url: ticketsPath({ ...EMPTY_FILTERS, pageName: ticket.pageName }) },
      { label: `HUB ${ticket.hubId}` },
    ]
  }

  return [
    { label: 'Tickets', url: '/tickets' },
    { label: ticket.pageName, url: ticketsPath({ ...EMPTY_FILTERS, pageName: ticket.pageName }) },
    { label: `HUB ${ticket.hubId}` },
  ]
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
  open: string[]
}

export const EMPTY_COMPONENT_EXTRAS: ComponentPageExtras = {
  selected: '',
  remainingOnly: false,
  sort: 'remaining',
  open: [],
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
  if (key === UNSPECIFIED_COMPONENT) return 'Unspecified'
  if (isModusParentId(key)) {
    const slug = key.slice(MODUS_PARENT_PREFIX.length)
    if (slug === OTHER_MODUS_SLUG) return OTHER_MODUS_TITLE
    return MODUS_CATALOG.find((entry) => entry.slug === slug)?.title ?? slug
  }
  return key
}

export function isRemainingTicket(ticket: Ticket): boolean {
  return ticket.status !== 'resolved' && ticket.status !== 'wont_fix'
}

const STATUS_RANK: Record<LocalStatus, number> = {
  open: 0,
  in_progress: 1,
  wont_fix: 2,
  resolved: 3,
}

/** Prefer the least-resolved local status when a common issue spans several HUB tickets. */
export function primaryStatus(tickets: Ticket[]): LocalStatus {
  if (tickets.length === 0) return 'open'
  return tickets.reduce(
    (best, ticket) =>
      STATUS_RANK[ticket.status] < STATUS_RANK[best] ? ticket.status : best,
    tickets[0].status,
  )
}

/**
 * Allyant “Common Issue ID” groups duplicate HUB tickets that share the same underlying finding.
 * Tickets with an empty commonIssueId stay as singleton groups keyed by hubId.
 */
export type CommonIssueGroup = {
  key: string
  commonIssueId: string
  tickets: Ticket[]
  hubIds: string[]
  description: string
  wcag: string
  priority: string
  category: string
  status: LocalStatus
  highRisk: boolean
  pages: string[]
  components: string[]
}

export function commonIssueKey(ticket: Ticket): string {
  const id = ticket.commonIssueId.trim()
  return id ? `common:${id}` : `hub:${ticket.hubId}`
}

export function groupTicketsByCommonIssue(tickets: Ticket[]): CommonIssueGroup[] {
  const uniqueTickets = [...new Map(tickets.map((ticket) => [ticket.hubId, ticket])).values()]
  const buckets = new Map<string, Ticket[]>()
  for (const ticket of uniqueTickets) {
    const key = commonIssueKey(ticket)
    const list = buckets.get(key)
    if (list) list.push(ticket)
    else buckets.set(key, [ticket])
  }

  const groups: CommonIssueGroup[] = [...buckets.entries()].map(([key, list]) => {
    const sorted = [...list].sort((a, b) => {
      const hubCmp = Number(a.hubId) - Number(b.hubId)
      if (!Number.isNaN(hubCmp) && hubCmp !== 0) return hubCmp
      return a.hubId.localeCompare(b.hubId)
    })
    const primary = sorted[0]
    return {
      key,
      commonIssueId: primary.commonIssueId.trim(),
      tickets: sorted,
      hubIds: [...new Set(sorted.map((ticket) => ticket.hubId))],
      description: primary.description,
      wcag: primary.wcag,
      priority: primary.priority,
      category: primary.category,
      status: primaryStatus(sorted),
      highRisk: sorted.some((ticket) => ticket.highRisk),
      pages: uniqueSorted(sorted.map((ticket) => ticket.pageName)),
      components: uniqueSorted(sorted.map((ticket) => ticket.component).filter(Boolean)),
    }
  })

  return groups.sort((a, b) => {
    const priorityOrder = (p: string) =>
      p === 'Critical' ? 0 : p === 'Serious' ? 1 : p === 'Warning' ? 2 : 3
    return (
      priorityOrder(a.priority) - priorityOrder(b.priority) ||
      b.hubIds.length - a.hubIds.length ||
      a.description.localeCompare(b.description)
    )
  })
}

function componentGroupFromTickets(key: string, label: string, tickets: Ticket[]): ComponentGroup {
  const uniqueTickets = [...new Map(tickets.map((ticket) => [ticket.hubId, ticket])).values()]
  const remainingTickets = uniqueTickets.filter(isRemainingTicket)
  return {
    key,
    label,
    tickets: uniqueTickets,
    total: uniqueTickets.length,
    remaining: remainingTickets.length,
    open: uniqueTickets.filter((ticket) => ticket.status === 'open').length,
    inProgress: uniqueTickets.filter((ticket) => ticket.status === 'in_progress').length,
    resolved: uniqueTickets.filter((ticket) => ticket.status === 'resolved').length,
    critical: remainingTickets.filter((ticket) => ticket.priority === 'Critical').length,
    highRisk: remainingTickets.filter((ticket) => ticket.highRisk).length,
    pages: uniqueSorted(uniqueTickets.map((ticket) => ticket.pageName)),
    categories: uniqueSorted(uniqueTickets.map((ticket) => ticket.category)),
  }
}

export function groupTicketsByComponent(tickets: Ticket[]): ComponentGroup[] {
  const buckets = new Map<string, Ticket[]>()
  for (const ticket of tickets) {
    const key = componentKey(ticket.component)
    const list = buckets.get(key)
    if (list) list.push(ticket)
    else buckets.set(key, [ticket])
  }

  return [...buckets.entries()].map(([key, list]) =>
    componentGroupFromTickets(key, componentLabel(key), list),
  )
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
  if (isModusParentId(groupKey)) {
    return branches.find((branch) => branch.id === groupKey)
  }
  return branches.find((branch) => branch.children.some((child) => child.key === groupKey))
}

/** Merge all Allyant children under a Modus parent into one selectable group. */
export function aggregateModusBranch(branch: ModusComponentBranch): ComponentGroup {
  return componentGroupFromTickets(
    branch.id,
    branch.title,
    branch.children.flatMap((child) => child.tickets),
  )
}

export function aggregateModusBranches(branches: ModusComponentBranch[]): ComponentGroup[] {
  return branches.map(aggregateModusBranch)
}

/** Resolve a URL `selected` value (legacy Allyant label or `modus:slug`) to a Modus parent id. */
export function resolveModusSelection(
  branches: ModusComponentBranch[],
  selected: string,
): string {
  if (!selected) return branches[0]?.id ?? ''
  const direct = branches.find((branch) => branch.id === selected)
  if (direct) return direct.id
  const parent = findModusBranchForGroup(branches, selected)
  return parent?.id ?? branches[0]?.id ?? ''
}

export function componentsPath(filters: TicketFilters, extras: ComponentPageExtras): string {
  const params = ticketsToSearchParams({ ...filters, component: '' })
  if (extras.selected) params.set('selected', extras.selected)
  if (extras.remainingOnly) params.set('remaining', 'yes')
  if (extras.sort === 'name') params.set('sort', 'name')
  if (extras.open.length) params.set('open', extras.open.join(','))
  const query = params.toString()
  return query ? `/components?${query}` : '/components'
}

export function componentExtrasFromSearch(search: string): ComponentPageExtras {
  const params = new URLSearchParams(search)
  return {
    selected: params.get('selected') ?? '',
    remainingOnly: params.get('remaining') === 'yes',
    sort: params.get('sort') === 'name' ? 'name' : 'remaining',
    open: (params.get('open') ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean),
  }
}

export function backLabelForPath(path: string): string {
  if (path.startsWith('/components')) return 'Back to Components'
  if (path.startsWith('/pages')) return 'Back to Pages'
  if (path.startsWith('/tickets')) return 'Back to tickets'
  if (path === '/') return 'Back to Dashboard'
  return 'Back'
}
