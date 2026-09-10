import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTable,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ITableColumn } from '@trimble-oss/moduswebcomponents'
import KpiCard from '../components/KpiCard'
import PageHeader from '../components/PageHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ticketsPath } from '../lib/tickets'
import { useTicketStore } from '../store/TicketStore'
import { EMPTY_FILTERS } from '../types/ticket'
import { clampCellText, badgeCell } from '../utils/tableCells'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { tickets, exportProgress } = useTicketStore()
  useDocumentTitle('Dashboard — WCAG Allyant')

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === 'open').length
    const inProgress = tickets.filter((ticket) => ticket.status === 'in_progress').length
    const resolved = tickets.filter((ticket) => ticket.status === 'resolved').length
    const wontFix = tickets.filter((ticket) => ticket.status === 'wont_fix').length
    const criticalOpen = tickets.filter(
      (ticket) => ticket.priority === 'Critical' && ticket.status === 'open',
    ).length
    const highRiskOpen = tickets.filter(
      (ticket) => ticket.highRisk && ticket.status !== 'resolved' && ticket.status !== 'wont_fix',
    ).length
    return { open, inProgress, resolved, wontFix, criticalOpen, highRiskOpen }
  }, [tickets])

  const pageRows = useMemo(() => {
    const counts = new Map<
      string,
      { pageName: string; total: number; open: number; critical: number }
    >()
    for (const ticket of tickets) {
      const current = counts.get(ticket.pageName) ?? {
        pageName: ticket.pageName,
        total: 0,
        open: 0,
        critical: 0,
      }
      current.total += 1
      if (ticket.status === 'open') current.open += 1
      if (ticket.priority === 'Critical' && ticket.status === 'open') current.critical += 1
      counts.set(ticket.pageName, current)
    }
    return [...counts.values()]
      .sort((a, b) => b.open - a.open || b.total - a.total)
      .slice(0, 12)
      .map((row) => ({
        id: row.pageName,
        pageName: row.pageName,
        open: String(row.open),
        critical: String(row.critical),
        total: String(row.total),
      }))
  }, [tickets])

  const pageColumns: ITableColumn[] = useMemo(
    () => [
      { id: 'pageName', accessor: 'pageName', header: 'Page', sortable: true, cellRenderer: clampCellText },
      { id: 'open', accessor: 'open', header: 'Open', sortable: true },
      { id: 'critical', accessor: 'critical', header: 'Critical open', sortable: true },
      { id: 'total', accessor: 'total', header: 'Total', sortable: true },
    ],
    [],
  )

  const categoryRows = useMemo(() => {
    const counts = new Map<string, number>()
    for (const ticket of tickets) {
      if (ticket.status === 'resolved' || ticket.status === 'wont_fix') continue
      const key = ticket.category || 'Unspecified'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, count]) => ({
        id: category,
        category,
        remaining: String(count),
      }))
  }, [tickets])

  const categoryColumns: ITableColumn[] = useMemo(
    () => [
      { id: 'category', accessor: 'category', header: 'Category', sortable: true },
      {
        id: 'remaining',
        accessor: 'remaining',
        header: 'Still open',
        sortable: true,
        cellRenderer: (value: unknown) => badgeCell(String(value), 'primary'),
      },
    ],
    [],
  )

  const downloadProgress = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'wcag-allyant-progress.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-page">
      <PageHeader
        title="WCAG Allyant"
        description="Local ticket tracker for the Unity Construct 2025 Allyant audit. Status, notes, and comments stay in this browser."
        actions={
          <>
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              onButtonClick={downloadProgress}
            >
              Export progress
            </ModusWcButton>
            <ModusWcButton
              variant="filled"
              color="primary"
              size="sm"
              onButtonClick={() => navigate('/tickets')}
            >
              <ModusWcIcon name="table" size="xs" decorative />
              All tickets
            </ModusWcButton>
          </>
        }
      />

      <ModusWcAlert
        variant="info"
        alertTitle="Developer workflow"
        alertDescription="Open a ticket, mark it In progress while you fix Unity Construct, then Resolved or Won’t fix. Allyant hub fields stay read-only."
      />

      <section className="app-kpi-grid" aria-label="Ticket counts">
        <KpiCard
          label="Open"
          value={String(stats.open)}
          icon="folder_open"
          hint={`${tickets.length} published issues`}
          actionLabel="View"
          onAction={() => navigate(ticketsPath({ ...EMPTY_FILTERS, status: 'open' }))}
        />
        <KpiCard
          label="In progress"
          value={String(stats.inProgress)}
          icon="hourglass"
          actionLabel="View"
          onAction={() => navigate(ticketsPath({ ...EMPTY_FILTERS, status: 'in_progress' }))}
        />
        <KpiCard
          label="Resolved"
          value={String(stats.resolved)}
          icon="check_circle"
          hint={`${stats.wontFix} won’t fix`}
          actionLabel="View"
          onAction={() => navigate(ticketsPath({ ...EMPTY_FILTERS, status: 'resolved' }))}
        />
        <KpiCard
          label="Critical still open"
          value={String(stats.criticalOpen)}
          icon="alert"
          actionLabel="View"
          onAction={() =>
            navigate(ticketsPath({ ...EMPTY_FILTERS, priority: 'Critical', status: 'open' }))
          }
        />
        <KpiCard
          label="High risk remaining"
          value={String(stats.highRiskOpen)}
          icon="warning"
          actionLabel="View"
          onAction={() => navigate(ticketsPath({ ...EMPTY_FILTERS, highRisk: true }))}
        />
        <KpiCard
          label="Pages"
          value={String(new Set(tickets.map((ticket) => ticket.pageName)).size)}
          icon="folder_closed"
          hint="Jump in by screen"
          actionLabel="Browse"
          onAction={() => navigate('/pages')}
        />
      </section>

      <ModusWcCard bordered={false} padding="compact">
        <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
          <ModusWcIcon name="folder_closed" decorative />
          <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Pages with the most open tickets" />
        </div>
        <div className="app-table-wrap">
          <ModusWcTable
            caption="Pages with the most open tickets"
            columns={pageColumns}
            data={pageRows}
            zebra
            hover
            sortable
            onRowClick={(event: CustomEvent<{ row: { pageName?: string } }>) => {
              const pageName = event.detail?.row?.pageName
              if (pageName) navigate(ticketsPath({ ...EMPTY_FILTERS, pageName }))
            }}
          />
        </div>
      </ModusWcCard>

      <ModusWcCard bordered={false} padding="compact">
        <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
          <ModusWcIcon name="tag" decorative />
          <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Open work by category" />
        </div>
        <div className="app-table-wrap">
          <ModusWcTable
            caption="Open work by category"
            columns={categoryColumns}
            data={categoryRows}
            zebra
            hover
            sortable
            onRowClick={(event: CustomEvent<{ row: { category?: string } }>) => {
              const category = event.detail?.row?.category
              if (category) {
                navigate(
                  ticketsPath({
                    ...EMPTY_FILTERS,
                    category: category === 'Unspecified' ? '' : category,
                  }),
                )
              }
            }}
          />
        </div>
      </ModusWcCard>
    </div>
  )
}
