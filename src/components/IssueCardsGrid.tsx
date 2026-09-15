import { useEffect, useMemo, useState } from 'react'
import {
  ModusWcPagination,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import IssueCard from './IssueCard'
import { groupTicketsByCommonIssue, type CommonIssueGroup } from '../lib/tickets'
import type { Ticket } from '../types/ticket'

const PAGE_SIZE = 24

type IssueCardsGridProps = {
  tickets: Ticket[]
  onHubSelect: (hubId: string) => void
  emptyLabel?: string
  resetKey?: string
}

export default function IssueCardsGrid({
  tickets,
  onHubSelect,
  emptyLabel = 'No issues match these filters.',
  resetKey = '',
}: IssueCardsGridProps) {
  const [page, setPage] = useState(1)

  const groups = useMemo(() => groupTicketsByCommonIssue(tickets), [tickets])

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageGroups = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return groups.slice(start, start + PAGE_SIZE)
  }, [groups, safePage])

  if (groups.length === 0) {
    return (
      <ModusWcTypography
        hierarchy="p"
        size="sm"
        customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
        label={emptyLabel}
      />
    )
  }

  const rangeStart = (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, groups.length)

  return (
    <div className="issue-cards-panel">
      <div className="issue-cards-list" role="list" aria-label="Accessibility issues">
        {pageGroups.map((group: CommonIssueGroup) => (
          <div key={group.key} className="min-w-0" role="listitem">
            <IssueCard
              group={group}
              onHubSelect={onHubSelect}
              onViewIssue={onHubSelect}
            />
          </div>
        ))}
      </div>

      <div className="issue-cards-footer">
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
          label={`Showing ${rangeStart}–${rangeEnd} of ${groups.length} issues`}
        />
        {totalPages > 1 ? (
          <ModusWcPagination
            count={totalPages}
            page={safePage}
            size="sm"
            ariaLabelValues={{
              firstPage: 'First page',
              lastPage: 'Last page',
              nextPage: 'Next page',
              previousPage: 'Previous page',
              page: 'Page {0}',
            }}
            onPageChange={(event: CustomEvent<{ newPage: number; prevPage: number }>) => {
              setPage(event.detail.newPage)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
