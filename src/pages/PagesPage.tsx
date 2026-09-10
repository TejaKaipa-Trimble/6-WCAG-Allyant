import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ModusWcCard,
  ModusWcIcon,
  ModusWcTable,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ITableColumn } from '@trimble-oss/moduswebcomponents'
import PageHeader from '../components/PageHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ticketsPath } from '../lib/tickets'
import { useTicketStore } from '../store/TicketStore'
import { EMPTY_FILTERS } from '../types/ticket'
import { clampCellText } from '../utils/tableCells'

export default function PagesPage() {
  const navigate = useNavigate()
  const { tickets } = useTicketStore()
  useDocumentTitle('Pages — WCAG Allyant')

  const rows = useMemo(() => {
    const counts = new Map<
      string,
      { pageName: string; total: number; open: number; critical: number; highRisk: number }
    >()
    for (const ticket of tickets) {
      const current = counts.get(ticket.pageName) ?? {
        pageName: ticket.pageName,
        total: 0,
        open: 0,
        critical: 0,
        highRisk: 0,
      }
      current.total += 1
      if (ticket.status === 'open') current.open += 1
      if (ticket.priority === 'Critical' && ticket.status !== 'resolved') current.critical += 1
      if (ticket.highRisk && ticket.status !== 'resolved') current.highRisk += 1
      counts.set(ticket.pageName, current)
    }
    return [...counts.values()]
      .sort((a, b) => a.pageName.localeCompare(b.pageName))
      .map((row) => ({
        id: row.pageName,
        pageName: row.pageName,
        open: String(row.open),
        critical: String(row.critical),
        highRisk: String(row.highRisk),
        total: String(row.total),
      }))
  }, [tickets])

  const columns: ITableColumn[] = useMemo(
    () => [
      { id: 'pageName', accessor: 'pageName', header: 'Page', sortable: true, cellRenderer: clampCellText },
      { id: 'open', accessor: 'open', header: 'Open', sortable: true },
      { id: 'critical', accessor: 'critical', header: 'Critical remaining', sortable: true },
      { id: 'highRisk', accessor: 'highRisk', header: 'High risk remaining', sortable: true },
      { id: 'total', accessor: 'total', header: 'Total', sortable: true },
    ],
    [],
  )

  return (
    <div className="app-page">
      <PageHeader
        title="Pages"
        description="Unity Construct screens from the Allyant export. Open a row to see that page’s tickets."
        crumbs={[{ label: 'Dashboard', url: '/' }, { label: 'Pages' }]}
      />
      <ModusWcCard bordered={false} padding="compact">
        <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
          <ModusWcIcon name="folder_closed" decorative />
          <ModusWcTypography
            hierarchy="h2"
            size="md"
            weight="semibold"
            label={`${rows.length} screens`}
          />
        </div>
        <div className="app-table-wrap">
          <ModusWcTable
            caption="Audit pages"
            columns={columns}
            data={rows}
            zebra
            hover
            sortable
            paginated
            pageSizeOptions={[25, 50, 100]}
            onRowClick={(event: CustomEvent<{ row: { pageName?: string } }>) => {
              const pageName = event.detail?.row?.pageName
              if (pageName) navigate(ticketsPath({ ...EMPTY_FILTERS, pageName }))
            }}
          />
        </div>
      </ModusWcCard>
    </div>
  )
}
