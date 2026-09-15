import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcChip,
  ModusWcIcon,
  ModusWcSelect,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ISelectOption } from '@trimble-oss/moduswebcomponents'
import IssueCardsGrid from '../components/IssueCardsGrid'
import PageHeader from '../components/PageHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  filterTickets,
  filtersFromSearch,
  groupTicketsByCommonIssue,
  ticketDetailPath,
  ticketsPath,
  uniqueSorted,
} from '../lib/tickets'
import { useTicketStore } from '../store/TicketStore'
import { LOCAL_STATUS_LABEL, type TicketFilters } from '../types/ticket'
import { readInputString } from '../utils/modusFormEvents'

export default function TicketsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tickets } = useTicketStore()
  const filters = useMemo(() => filtersFromSearch(searchParams.toString()), [searchParams])

  useDocumentTitle('Tickets — WCAG Allyant')

  const filtered = useMemo(() => filterTickets(tickets, filters), [tickets, filters])
  const issueCount = useMemo(() => groupTicketsByCommonIssue(filtered).length, [filtered])
  const filtersReturnTo = useMemo(() => ticketsPath(filters), [filters])

  const pageOptions: ISelectOption[] = useMemo(
    () => [
      { label: 'All pages', value: '' },
      ...uniqueSorted(tickets.map((ticket) => ticket.pageName)).map((pageName) => ({
        label: pageName,
        value: pageName,
      })),
    ],
    [tickets],
  )

  const componentOptions: ISelectOption[] = useMemo(() => {
    const named = uniqueSorted(tickets.map((ticket) => ticket.component))
    return [
      { label: 'All components', value: '' },
      { label: 'Unspecified', value: '__none__' },
      ...named.map((name) => ({ label: name, value: name })),
    ]
  }, [tickets])

  const categoryOptions: ISelectOption[] = useMemo(
    () => [
      { label: 'All categories', value: '' },
      ...uniqueSorted(tickets.map((ticket) => ticket.category)).map((category) => ({
        label: category,
        value: category,
      })),
    ],
    [tickets],
  )

  const priorityOptions: ISelectOption[] = [
    { label: 'All priorities', value: '' },
    { label: 'Critical', value: 'Critical' },
    { label: 'Serious', value: 'Serious' },
    { label: 'Warning', value: 'Warning' },
  ]

  const statusOptions: ISelectOption[] = [
    { label: 'All statuses', value: '' },
    ...Object.entries(LOCAL_STATUS_LABEL).map(([value, label]) => ({ label, value })),
  ]

  const update = (patch: Partial<TicketFilters>) => {
    navigate(ticketsPath({ ...filters, ...patch }))
  }

  const hasFilters =
    Boolean(filters.q) ||
    Boolean(filters.pageName) ||
    Boolean(filters.component) ||
    Boolean(filters.priority) ||
    Boolean(filters.category) ||
    Boolean(filters.status) ||
    filters.highRisk ||
    filters.sitewide

  return (
    <div className="app-page">
      <PageHeader
        title="All tickets"
        description={`${issueCount} issues · ${filtered.length} of ${tickets.length} HUB tickets`}
        crumbs={[{ label: 'Dashboard', url: '/' }, { label: 'Tickets' }]}
        actions={
          hasFilters ? (
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              onButtonClick={() => navigate('/tickets')}
            >
              Clear filters
            </ModusWcButton>
          ) : null
        }
      />

      <ModusWcCard bordered={false} padding="compact">
        <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
          <ModusWcIcon name="filter" decorative />
          <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Filters" />
        </div>
        <div className="app-card-body">
          <div className="app-filter-grid">
            <ModusWcTextInput
              label="Search"
              size="sm"
              value={filters.q}
              placeholder="HUB ID, page, issue, WCAG…"
              onInputChange={(event: CustomEvent) => update({ q: readInputString(event) })}
            />
            <ModusWcSelect
              label="Page"
              size="sm"
              value={filters.pageName}
              options={pageOptions}
              onInputChange={(event: CustomEvent) => update({ pageName: readInputString(event) })}
            />
            <ModusWcSelect
              label="Component"
              size="sm"
              value={filters.component}
              options={componentOptions}
              onInputChange={(event: CustomEvent) => update({ component: readInputString(event) })}
            />
            <ModusWcSelect
              label="Priority"
              size="sm"
              value={filters.priority}
              options={priorityOptions}
              onInputChange={(event: CustomEvent) => update({ priority: readInputString(event) })}
            />
            <ModusWcSelect
              label="Category"
              size="sm"
              value={filters.category}
              options={categoryOptions}
              onInputChange={(event: CustomEvent) => update({ category: readInputString(event) })}
            />
            <ModusWcSelect
              label="Local status"
              size="sm"
              value={filters.status}
              options={statusOptions}
              onInputChange={(event: CustomEvent) => update({ status: readInputString(event) })}
            />
          </div>
          <div className="app-chip-row" role="group" aria-label="Quick filters">
            <ModusWcChip
              label="High risk"
              size="sm"
              active={filters.highRisk}
              variant={filters.highRisk ? 'filled' : 'outline'}
              showRemove={filters.highRisk}
              onChipClick={() => {
                if (!filters.highRisk) update({ highRisk: true })
              }}
              onChipRemove={() => update({ highRisk: false })}
              aria-label={filters.highRisk ? 'High risk filter, active' : 'High risk filter'}
            />
            <ModusWcChip
              label="Sitewide"
              size="sm"
              active={filters.sitewide}
              variant={filters.sitewide ? 'filled' : 'outline'}
              showRemove={filters.sitewide}
              onChipClick={() => {
                if (!filters.sitewide) update({ sitewide: true })
              }}
              onChipRemove={() => update({ sitewide: false })}
              aria-label={filters.sitewide ? 'Sitewide filter, active' : 'Sitewide filter'}
            />
          </div>
        </div>
      </ModusWcCard>

      <ModusWcCard bordered={false} padding="compact">
        <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
          <ModusWcIcon name="dashboard" decorative />
          <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Issues" />
        </div>
        <IssueCardsGrid
          tickets={filtered}
          resetKey={searchParams.toString()}
          onHubSelect={(hubId) => navigate(ticketDetailPath(hubId, filtersReturnTo))}
        />
      </ModusWcCard>
    </div>
  )
}
