export type LocalStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix'

export type AuditIssue = {
  hubId: string
  location: string
  pageName: string
  sitewide: boolean
  affectedItem: string
  additionalElements: string
  component: string
  description: string
  wcag: string
  affectedUsers: string
  recommendedFix: string
  priority: string
  category: string
  commonIssueId: string
  allyantStatus: string
  highRisk: boolean
  lastComment: string
  screenshots: string[]
  issueLink: string
  kbArticles: string[]
}

export type TicketComment = {
  id: string
  text: string
  createdAt: string
}

export type TicketOverlay = {
  status: LocalStatus
  notes: string
  comments: TicketComment[]
  updatedAt: string
}

export type Ticket = AuditIssue & {
  status: LocalStatus
  notes: string
  comments: TicketComment[]
  updatedAt: string | null
}

export type TicketFilters = {
  q: string
  pageName: string
  component: string
  priority: string
  category: string
  status: string
  highRisk: boolean
  sitewide: boolean
}

export const LOCAL_STATUS_LABEL: Record<LocalStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  wont_fix: "Won't fix",
}

export const LOCAL_STATUS_OPTIONS = Object.entries(LOCAL_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
)

export const EMPTY_FILTERS: TicketFilters = {
  q: '',
  pageName: '',
  component: '',
  priority: '',
  category: '',
  status: '',
  highRisk: false,
  sitewide: false,
}
