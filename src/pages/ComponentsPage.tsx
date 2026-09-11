import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ModusWcAccordion,
  ModusWcAlert,
  ModusWcBadge,
  ModusWcButton,
  ModusWcCard,
  ModusWcChip,
  ModusWcCollapse,
  ModusWcDivider,
  ModusWcIcon,
  ModusWcMenu,
  ModusWcMenuItem,
  ModusWcProgress,
  ModusWcSelect,
  ModusWcTable,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type {
  ICollapseOptions,
  IPaginationChangeEventDetail,
  ISelectOption,
  ITableColumn,
} from '@trimble-oss/moduswebcomponents'
import ComponentStatTile from '../components/ComponentStatTile'
import PageHeader from '../components/PageHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  componentExtrasFromSearch,
  componentsPath,
  EMPTY_COMPONENT_EXTRAS,
  filterTickets,
  findModusBranchForGroup,
  filtersFromSearch,
  groupComponentGroupsByModus,
  groupTicketsByComponent,
  isLocalStatus,
  sortComponentGroups,
  ticketsPath,
  uniqueSorted,
  type ComponentGroup,
  type ComponentSort,
} from '../lib/tickets'
import { useTicketStore } from '../store/TicketStore'
import { EMPTY_FILTERS, LOCAL_STATUS_LABEL, type Ticket, type TicketFilters } from '../types/ticket'
import { readInputString } from '../utils/modusFormEvents'
import {
  clampCellText,
  priorityBadgeColor,
  statusCell,
  yesNoCell,
  badgeCell,
} from '../utils/tableCells'

function ticketMatchesQuery(ticket: Ticket, query: string): boolean {
  if (!query) return true
  const haystack = [
    ticket.hubId,
    ticket.pageName,
    ticket.component || 'Unspecified',
    ticket.description,
    ticket.affectedItem,
    ticket.wcag,
    ticket.category,
    ticket.recommendedFix,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

export default function ComponentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tickets } = useTicketStore()
  const filters = useMemo(() => filtersFromSearch(searchParams.toString()), [searchParams])
  const extras = useMemo(() => componentExtrasFromSearch(searchParams.toString()), [searchParams])
  const [page, setPage] = useState(1)
  const userPicked = useRef(false)

  useDocumentTitle('Components — WCAG Allyant')

  const catalog = useMemo(
    () => sortComponentGroups(groupTicketsByComponent(tickets), extras.sort),
    [tickets, extras.sort],
  )

  const catalogBranches = useMemo(
    () => groupComponentGroupsByModus(catalog, extras.sort),
    [catalog, extras.sort],
  )

  const groups = useMemo(() => {
    const query = filters.q.trim().toLowerCase()
    const scoped = filterTickets(tickets, { ...filters, component: '', q: '' }).filter((ticket) =>
      ticketMatchesQuery(ticket, query),
    )
    let next = groupTicketsByComponent(scoped)
    if (extras.remainingOnly) {
      next = next.filter((group) => group.remaining > 0)
    }
    return sortComponentGroups(next, extras.sort)
  }, [tickets, filters, extras.remainingOnly, extras.sort])

  const visibleGroups = useMemo(
    () => new Map(groups.map((group) => [group.key, group])),
    [groups],
  )

  const visibleBranchSlugs = useMemo(() => {
    const slugs = new Set<string>()
    for (const branch of catalogBranches) {
      if (branch.children.some((child) => visibleGroups.has(child.key))) slugs.add(branch.slug)
    }
    return slugs
  }, [catalogBranches, visibleGroups])

  const visibleBranchKey = useMemo(
    () => [...visibleBranchSlugs].sort().join('|'),
    [visibleBranchSlugs],
  )

  const [openSlugs, setOpenSlugs] = useState<string[]>([])

  const collapseOptions = useMemo(() => {
    const map = new Map<string, ICollapseOptions>()
    for (const branch of catalogBranches) {
      const shown = branch.children.filter((child) => visibleGroups.has(child.key))
      const remaining = shown.reduce(
        (sum, child) => sum + (visibleGroups.get(child.key)?.remaining ?? child.remaining),
        0,
      )
      const total = shown.reduce(
        (sum, child) => sum + (visibleGroups.get(child.key)?.total ?? child.total),
        0,
      )
      map.set(branch.slug, {
        title: `${branch.title} · ${remaining} remaining`,
        description: `${shown.length} Allyant items · ${total} tickets`,
        size: 'sm',
      })
    }
    return map
  }, [catalogBranches, visibleGroups])

  const selectedGroup: ComponentGroup | undefined = useMemo(() => {
    if (groups.length === 0) return undefined
    return groups.find((group) => group.key === extras.selected) ?? groups[0]
  }, [groups, extras.selected])

  useEffect(() => {
    if (!selectedGroup) return
    if (extras.selected === selectedGroup.key) return
    navigate(componentsPath(filters, { ...extras, selected: selectedGroup.key }), { replace: true })
  }, [extras, filters, navigate, selectedGroup])

  useEffect(() => {
    if (!selectedGroup) return
    const parent = findModusBranchForGroup(catalogBranches, selectedGroup.key)
    if (!parent) return
    setOpenSlugs((prev) => (prev.includes(parent.slug) ? prev : [...prev, parent.slug]))
  }, [catalogBranches, selectedGroup])

  useEffect(() => {
    if (!filters.q.trim()) return
    setOpenSlugs(visibleBranchKey ? visibleBranchKey.split('|') : [])
  }, [filters.q, visibleBranchKey])

  useEffect(() => {
    setPage(1)
  }, [searchParams])

  useEffect(() => {
    if (!userPicked.current) return
    userPicked.current = false
    document.getElementById('component-detail')?.scrollIntoView({ block: 'nearest' })
  }, [extras.selected])

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

  const sortOptions: ISelectOption[] = [
    { label: 'Remaining work', value: 'remaining' },
    { label: 'Name A–Z', value: 'name' },
  ]

  const go = (nextFilters: TicketFilters, nextExtras = extras) => {
    navigate(componentsPath(nextFilters, nextExtras))
  }

  const update = (patch: Partial<TicketFilters>) => {
    go({ ...filters, ...patch })
  }

  const selectGroup = (key: string) => {
    userPicked.current = true
    go(filters, { ...extras, selected: key })
  }

  const columns: ITableColumn[] = useMemo(
    () => [
      { id: 'hubId', accessor: 'hubId', header: 'HUB ID', sortable: true },
      { id: 'pageName', accessor: 'pageName', header: 'Page', sortable: true, cellRenderer: clampCellText },
      { id: 'description', accessor: 'description', header: 'Issue', sortable: true, cellRenderer: clampCellText },
      {
        id: 'priority',
        accessor: 'priority',
        header: 'Priority',
        sortable: true,
        cellRenderer: (value: unknown) =>
          badgeCell(String(value || '—'), priorityBadgeColor(String(value))),
      },
      { id: 'category', accessor: 'category', header: 'Category', sortable: true, cellRenderer: clampCellText },
      {
        id: 'status',
        accessor: 'status',
        header: 'Status',
        sortable: true,
        cellRenderer: (value: unknown) => {
          const status = String(value)
          return isLocalStatus(status) ? statusCell(status) : clampCellText(value)
        },
      },
      {
        id: 'highRisk',
        accessor: 'highRiskLabel',
        header: 'High risk',
        sortable: true,
        cellRenderer: (_value: unknown, row: unknown) =>
          yesNoCell(Boolean((row as { highRisk?: boolean }).highRisk)),
      },
    ],
    [],
  )

  const tableData = useMemo(
    () =>
      (selectedGroup?.tickets ?? []).map((ticket) => ({
        id: ticket.hubId,
        hubId: ticket.hubId,
        pageName: ticket.pageName,
        description: ticket.description,
        priority: ticket.priority,
        category: ticket.category,
        status: ticket.status,
        highRisk: ticket.highRisk,
        highRiskLabel: ticket.highRisk ? 'Yes' : '',
      })),
    [selectedGroup],
  )

  const hasFilters =
    Boolean(filters.q) ||
    Boolean(filters.pageName) ||
    Boolean(filters.priority) ||
    Boolean(filters.category) ||
    Boolean(filters.status) ||
    filters.highRisk ||
    filters.sitewide ||
    extras.remainingOnly

  const listCount = groups.length
  const totalComponents = useMemo(
    () => groupTicketsByComponent(tickets).length,
    [tickets],
  )

  const summaryStats = useMemo(() => {
    let remaining = 0
    let total = 0
    let critical = 0
    let highRisk = 0
    for (const group of groups) {
      remaining += group.remaining
      total += group.total
      critical += group.critical
      highRisk += group.highRisk
    }
    const resolved = total - remaining
    const resolvedPct = total > 0 ? Math.round((resolved / total) * 100) : 0
    return { remaining, total, critical, highRisk, resolved, resolvedPct }
  }, [groups])

  const selectedProgress = useMemo(() => {
    if (!selectedGroup || selectedGroup.total === 0) return 0
    const done = selectedGroup.total - selectedGroup.remaining
    return Math.round((done / selectedGroup.total) * 100)
  }, [selectedGroup])

  return (
    <div className="app-page app-page-fill components-page">
      <PageHeader
        title="Components"
        description="Allyant items nested under Modus component names. Expand a parent to find matching audit items; unmatched names are under Other."
        crumbs={[{ label: 'Dashboard', url: '/' }, { label: 'Components' }]}
        actions={
          hasFilters ? (
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              onButtonClick={() =>
                go(EMPTY_FILTERS, { ...EMPTY_COMPONENT_EXTRAS, selected: extras.selected, sort: extras.sort })
              }
            >
              Clear filters
            </ModusWcButton>
          ) : null
        }
      />

      <section className="components-summary-grid" aria-label="Component overview">
        <ComponentStatTile
          label="Allyant items"
          value={`${listCount} of ${totalComponents}`}
          icon="component"
          tone="primary"
        />
        <ComponentStatTile
          label="Remaining tickets"
          value={String(summaryStats.remaining)}
          icon="hourglass"
          tone={summaryStats.remaining > 0 ? 'warning' : 'success'}
        />
        <ComponentStatTile
          label="Critical remaining"
          value={String(summaryStats.critical)}
          icon="alert"
          tone={summaryStats.critical > 0 ? 'danger' : 'default'}
        />
        <ComponentStatTile
          label="Modus groups"
          value={String(visibleBranchSlugs.size)}
          icon="folder_closed"
        />
      </section>

      <ModusWcCard bordered={false} padding="compact" customClass="components-filter-card" aria-label="Filters">
        <div className="components-filter-body">
          <div className="components-filter-grid">
            <ModusWcTextInput
              label="Search"
              size="sm"
              value={filters.q}
              placeholder="Component, HUB ID, page, WCAG…"
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
            <ModusWcSelect
              label="Sort list"
              size="sm"
              value={extras.sort}
              options={sortOptions}
              onInputChange={(event: CustomEvent) => {
                const value = readInputString(event)
                const sort: ComponentSort = value === 'name' ? 'name' : 'remaining'
                go(filters, { ...extras, sort })
              }}
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
            <ModusWcChip
              label="Has remaining work"
              size="sm"
              active={extras.remainingOnly}
              variant={extras.remainingOnly ? 'filled' : 'outline'}
              showRemove={extras.remainingOnly}
              onChipClick={() => {
                if (!extras.remainingOnly) go(filters, { ...extras, remainingOnly: true })
              }}
              onChipRemove={() => go(filters, { ...extras, remainingOnly: false })}
              aria-label={
                extras.remainingOnly ? 'Remaining work filter, active' : 'Remaining work filter'
              }
            />
          </div>
        </div>
      </ModusWcCard>

      <div className="app-component-split">
        <div className="app-component-list-col">
          <ModusWcCard bordered={false} padding="compact" customClass="components-list-card">
            <div slot="title" className="flex w-full min-w-0 items-center justify-between gap-3 mb-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <ModusWcIcon name="component" decorative />
                <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Browse by Modus" />
              </div>
              <div className="shrink-0">
                <ModusWcBadge variant="filled" color="high-contrast" size="sm">
                  {listCount}
                </ModusWcBadge>
              </div>
            </div>
            <div className="components-list-shell">
            <div
              className={listCount > 0 ? 'app-is-hidden' : undefined}
              aria-hidden={listCount > 0}
              ref={(el) => {
                if (el) el.inert = listCount > 0
              }}
            >
              <div className="components-empty-hint">
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  hidden={listCount > 0}
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
                  label="No components match these filters. Try clearing a filter or broadening your search."
                />
              </div>
            </div>
            <ModusWcAccordion hidden={listCount === 0} aria-label="Modus component groups">
              {catalogBranches.map((branch) => {
                const parentVisible = visibleBranchSlugs.has(branch.slug)
                return (
                  <ModusWcCollapse
                    key={branch.slug}
                    hidden={!parentVisible}
                    collapseId={`modus-${branch.slug}`}
                    expanded={openSlugs.includes(branch.slug)}
                    options={collapseOptions.get(branch.slug)}
                    onExpandedChange={(event: CustomEvent<{ expanded: boolean }>) => {
                      const nextOpen = event.detail.expanded
                      setOpenSlugs((prev) => {
                        if (nextOpen) {
                          return prev.includes(branch.slug) ? prev : [...prev, branch.slug]
                        }
                        return prev.filter((slug) => slug !== branch.slug)
                      })
                    }}
                  >
                    <div slot="content" className="app-component-tree-children">
                      <ModusWcMenu
                        size="sm"
                        selectionMode="single"
                        customClass="w-full"
                        aria-label={`${branch.title} Allyant items`}
                      >
                        {branch.children.map((group) => {
                          const shown = visibleGroups.get(group.key)
                          return (
                            <ModusWcMenuItem
                              key={group.key}
                              hidden={!shown}
                              label={group.label}
                              value={group.key}
                              size="sm"
                              selected={selectedGroup?.key === group.key}
                              subLabel={`${(shown ?? group).remaining} remaining · ${(shown ?? group).total} total`}
                              tooltipContent={group.label}
                              onItemSelect={() => selectGroup(group.key)}
                            >
                              <ModusWcIcon slot="start-icon" name="component" size="sm" decorative />
                            </ModusWcMenuItem>
                          )
                        })}
                      </ModusWcMenu>
                    </div>
                  </ModusWcCollapse>
                )
              })}
            </ModusWcAccordion>
            </div>
          </ModusWcCard>
        </div>

        <div id="component-detail" className="app-component-detail-col" tabIndex={-1}>
          <div className={!selectedGroup ? 'app-is-hidden' : undefined} aria-hidden={!selectedGroup}>
            <ModusWcCard bordered={false} padding="compact" customClass="components-detail-card">
              <div slot="title" className="flex w-full min-w-0 items-center justify-between gap-3 mb-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ModusWcIcon name="component" decorative />
                  <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Item detail" />
                </div>
                <div className="shrink-0">
                  <ModusWcButton
                    variant="filled"
                    color="primary"
                    size="sm"
                    onButtonClick={() => {
                      if (!selectedGroup) return
                      navigate(
                        ticketsPath({
                          ...EMPTY_FILTERS,
                          component: selectedGroup.key,
                          q: filters.q,
                          pageName: filters.pageName,
                          priority: filters.priority,
                          category: filters.category,
                          status: filters.status,
                          highRisk: filters.highRisk,
                          sitewide: filters.sitewide,
                        }),
                      )
                    }}
                  >
                    <ModusWcIcon name="table" size="xs" decorative />
                    View tickets
                  </ModusWcButton>
                </div>
              </div>
              <div className="app-card-body">
                <div className="components-detail-hero">
                  <div className="components-detail-hero__progress">
                    <ModusWcProgress
                      variant="radial"
                      value={selectedProgress}
                      max={100}
                      aria-label={`${selectedProgress}% of tickets resolved for this item`}
                    >
                      <ModusWcTypography
                        hierarchy="p"
                        size="sm"
                        weight="bold"
                        customClass="!m-0 tabular-nums"
                        label={`${selectedProgress}%`}
                      />
                    </ModusWcProgress>
                  </div>
                  <div className="components-detail-hero__copy">
                    <ModusWcTypography
                      hierarchy="h3"
                      size="xl"
                      weight="semibold"
                      customClass="!m-0"
                      label={selectedGroup?.label ?? 'Component'}
                    />
                    <ModusWcTypography
                      hierarchy="p"
                      size="sm"
                      customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
                      label={`${selectedGroup?.remaining ?? 0} tickets remaining of ${selectedGroup?.total ?? 0} total`}
                    />
                    <ModusWcProgress
                      value={selectedGroup ? selectedGroup.total - selectedGroup.remaining : 0}
                      max={selectedGroup?.total ?? 100}
                      aria-label="Resolution progress"
                      customClass="components-detail-hero__bar"
                    />
                  </div>
                </div>

                <ModusWcDivider />

                <div className="components-detail-stats">
                  <ComponentStatTile
                    label="Open"
                    value={String(selectedGroup?.open ?? 0)}
                    icon="folder_open"
                  />
                  <ComponentStatTile
                    label="In progress"
                    value={String(selectedGroup?.inProgress ?? 0)}
                    icon="hourglass"
                    tone="primary"
                  />
                  <ComponentStatTile
                    label="Resolved"
                    value={String(selectedGroup?.resolved ?? 0)}
                    icon="check_circle"
                    tone="success"
                  />
                  <ComponentStatTile
                    label="Critical"
                    value={String(selectedGroup?.critical ?? 0)}
                    icon="alert"
                    tone={selectedGroup && selectedGroup.critical > 0 ? 'danger' : 'default'}
                  />
                  <ComponentStatTile
                    label="High risk"
                    value={String(selectedGroup?.highRisk ?? 0)}
                    icon="warning"
                    tone={selectedGroup && selectedGroup.highRisk > 0 ? 'warning' : 'default'}
                  />
                  <ComponentStatTile
                    label="Pages"
                    value={String(selectedGroup?.pages.length ?? 0)}
                    icon="folder_closed"
                  />
                </div>

                {selectedGroup && selectedGroup.categories.length > 0 ? (
                  <>
                    <ModusWcDivider />
                    <div className="components-category-row">
                      <ModusWcTypography
                        hierarchy="p"
                        size="xs"
                        weight="semibold"
                        customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0 shrink-0"
                        label="Categories"
                      />
                      {selectedGroup.categories.map((category) => (
                        <ModusWcChip key={category} label={category} size="sm" variant="outline" />
                      ))}
                    </div>
                  </>
                ) : null}

                {selectedGroup && selectedGroup.pages.length > 0 ? (
                  <>
                    <ModusWcDivider />
                    <Meta
                      label="Affected pages"
                      value={`${selectedGroup.pages.slice(0, 10).join(', ')}${
                        selectedGroup.pages.length > 10 ? ` (+${selectedGroup.pages.length - 10} more)` : ''
                      }`}
                    />
                  </>
                ) : null}
              </div>
            </ModusWcCard>
          </div>

          <div className={!selectedGroup ? 'app-is-hidden' : undefined} aria-hidden={!selectedGroup}>
            <ModusWcCard bordered={false} padding="compact">
              <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
                <ModusWcIcon name="table" decorative />
                <ModusWcTypography
                  hierarchy="h2"
                  size="md"
                  weight="semibold"
                  label={`Tickets (${selectedGroup?.total ?? 0})`}
                />
              </div>
              <div className="app-table-wrap">
                <ModusWcTable
                  caption={`Tickets for ${selectedGroup?.label ?? 'component'}`}
                  columns={columns}
                  data={tableData}
                  zebra
                  hover
                  sortable
                  paginated
                  currentPage={page}
                  pageSizeOptions={[25, 50, 100]}
                  onPaginationChange={(event: CustomEvent<IPaginationChangeEventDetail>) => {
                    setPage(event.detail.currentPage)
                  }}
                  onRowClick={(event: CustomEvent<{ row: { hubId?: string } }>) => {
                    const hubId = event.detail?.row?.hubId
                    if (hubId) navigate(`/tickets/${hubId}`)
                  }}
                />
              </div>
            </ModusWcCard>
          </div>

          <ModusWcAlert
            hidden={Boolean(selectedGroup)}
            variant="info"
            alertTitle="Select an Allyant item"
            alertDescription="Expand a Modus group on the left, then choose an item to review progress, affected pages, and related tickets."
          />
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <ModusWcTypography
        hierarchy="p"
        size="xs"
        weight="semibold"
        customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
        label={label}
      />
      <ModusWcTypography hierarchy="p" size="sm" customClass="app-prewrap" label={value || '—'} />
    </div>
  )
}
