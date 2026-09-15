import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ModusWcAlert,
  ModusWcBadge,
  ModusWcButton,
  ModusWcCard,
  ModusWcChip,
  ModusWcDivider,
  ModusWcIcon,
  ModusWcLink,
  ModusWcMenu,
  ModusWcMenuItem,
  ModusWcProgress,
  ModusWcSelect,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ISelectOption } from '@trimble-oss/moduswebcomponents'
import ComponentStatTile from '../components/ComponentStatTile'
import IssueCardsGrid from '../components/IssueCardsGrid'
import PageHeader from '../components/PageHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  modusComponentDocsUrl,
  modusSlugFromParentId,
} from '../lib/modusCatalog'
import {
  aggregateModusBranches,
  componentExtrasFromSearch,
  componentsPath,
  EMPTY_COMPONENT_EXTRAS,
  ticketDetailPath,
  filterTickets,
  filtersFromSearch,
  groupComponentGroupsByModus,
  groupTicketsByCommonIssue,
  groupTicketsByComponent,
  resolveModusSelection,
  sortComponentGroups,
  ticketsPath,
  uniqueSorted,
  type ComponentGroup,
  type ComponentSort,
} from '../lib/tickets'
import { useTeam } from '../store/TeamStore'
import { useTicketStore } from '../store/TicketStore'
import { EMPTY_FILTERS, LOCAL_STATUS_LABEL, type Ticket, type TicketFilters } from '../types/ticket'
import { readInputString } from '../utils/modusFormEvents'

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
  const { team } = useTeam()
  const { tickets } = useTicketStore()
  const filters = useMemo(() => filtersFromSearch(searchParams.toString()), [searchParams])
  const extras = useMemo(() => componentExtrasFromSearch(searchParams.toString()), [searchParams])
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

  const allyantGroups = useMemo(() => {
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

  const visibleAllyantKeys = useMemo(
    () => new Set(allyantGroups.map((group) => group.key)),
    [allyantGroups],
  )

  const visibleBranches = useMemo(() => {
    return catalogBranches
      .map((branch) => {
        const children = branch.children
          .filter((child) => visibleAllyantKeys.has(child.key))
          .map((child) => allyantGroups.find((group) => group.key === child.key) ?? child)
        if (children.length === 0) return null
        return {
          ...branch,
          children,
          total: children.reduce((sum, child) => sum + child.total, 0),
          remaining: children.reduce((sum, child) => sum + child.remaining, 0),
        }
      })
      .filter((branch): branch is NonNullable<typeof branch> => branch !== null)
  }, [allyantGroups, catalogBranches, visibleAllyantKeys])

  const groups = useMemo(
    () => sortComponentGroups(aggregateModusBranches(visibleBranches), extras.sort),
    [visibleBranches, extras.sort],
  )

  const componentsReturnTo = useMemo(
    () => componentsPath(filters, { ...extras, open: [] }),
    [extras, filters],
  )

  const selectedKey = useMemo(
    () => resolveModusSelection(visibleBranches, extras.selected),
    [visibleBranches, extras.selected],
  )

  const selectedGroup: ComponentGroup | undefined = useMemo(() => {
    if (groups.length === 0) return undefined
    return groups.find((group) => group.key === selectedKey) ?? groups[0]
  }, [groups, selectedKey])

  const allyantSourceCount = useMemo(() => {
    const branch = visibleBranches.find((item) => item.id === selectedGroup?.key)
    return branch?.children.length ?? 0
  }, [selectedGroup, visibleBranches])

  useEffect(() => {
    if (!selectedGroup) return
    if (extras.selected === selectedGroup.key) return
    navigate(componentsPath(filters, { ...extras, selected: selectedGroup.key, open: [] }), {
      replace: true,
    })
  }, [extras, filters, navigate, selectedGroup])

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

  const go = (nextFilters: TicketFilters, nextExtras = { ...extras, open: [] as string[] }) => {
    navigate(componentsPath(nextFilters, nextExtras))
  }

  const update = (patch: Partial<TicketFilters>) => {
    go({ ...filters, ...patch })
  }

  const selectGroup = (key: string) => {
    userPicked.current = true
    go(filters, { ...extras, selected: key, open: [] })
  }

  useEffect(() => {
    if (team !== 'modus' || !filters.pageName) return
    go({ ...filters, pageName: '' })
  }, [team, filters.pageName])

  const selectedIssueCount = useMemo(
    () => groupTicketsByCommonIssue(selectedGroup?.tickets ?? []).length,
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
  const totalAllyantItems = useMemo(
    () => groupTicketsByComponent(tickets).length,
    [tickets],
  )
  const totalModusGroups = useMemo(
    () => groupComponentGroupsByModus(groupTicketsByComponent(tickets), extras.sort).length,
    [tickets, extras.sort],
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

  const selectedDocsUrl = useMemo(() => {
    if (!selectedGroup) return null
    const slug = modusSlugFromParentId(selectedGroup.key)
    return slug ? modusComponentDocsUrl(slug) : null
  }, [selectedGroup])

  const clearFilters = () =>
    go(EMPTY_FILTERS, {
      ...EMPTY_COMPONENT_EXTRAS,
      selected: extras.selected,
      sort: extras.sort,
      open: [],
    })

  return (
    <div className="app-page app-page-fill components-page">
      <div className="components-chrome">
      {team === 'modus' ? null : (
        <PageHeader
          compact
          title="Components"
          actions={
            hasFilters ? (
              <ModusWcButton
                variant="outlined"
                color="tertiary"
                size="sm"
                onButtonClick={clearFilters}
              >
                Clear filters
              </ModusWcButton>
            ) : null
          }
        />
      )}

      <section className="components-summary-grid" aria-label="Component overview">
        <ComponentStatTile
          label="Modus groups"
          value={`${listCount} of ${totalModusGroups}`}
          icon="folder_closed"
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
          label="Allyant items"
          value={String(totalAllyantItems)}
          icon="component"
        />
      </section>
      </div>

      <section className="components-filter-body" aria-label="Filters">
        <div className="components-filter-grid">
          <ModusWcTextInput
            label="Search"
            size="sm"
            value={filters.q}
            placeholder="Component, HUB ID, page, WCAG…"
            onInputChange={(event: CustomEvent) => update({ q: readInputString(event) })}
          />
          <div hidden={team === 'modus'}>
            <ModusWcSelect
              label="Page"
              size="sm"
              value={filters.pageName}
              options={pageOptions}
              onInputChange={(event: CustomEvent) => update({ pageName: readInputString(event) })}
            />
          </div>
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
          {team === 'modus' && hasFilters ? (
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              onButtonClick={clearFilters}
            >
              Clear filters
            </ModusWcButton>
          ) : null}
        </div>
      </section>

      <div className="app-component-split">
        <div className="app-component-list-col">
          <ModusWcCard bordered={false} padding="compact" customClass="components-list-card">
            <div slot="title" className="flex w-full min-w-0 items-center justify-between gap-2 mb-1">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <ModusWcIcon name="component" size="sm" decorative />
                <ModusWcTypography
                  hierarchy={team === 'modus' ? 'h1' : 'h2'}
                  size="sm"
                  weight="semibold"
                  label="Browse by Modus"
                />
              </div>
              <div className="shrink-0">
                <ModusWcBadge variant="filled" color="high-contrast" size="sm">
                  {listCount}
                </ModusWcBadge>
              </div>
            </div>
            <div className="components-list-shell components-list-panel">
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
            <ModusWcMenu
              hidden={listCount === 0}
              size="sm"
              selectionMode="single"
              customClass="w-full"
              aria-label="Modus component groups"
            >
              {groups.map((group) => {
                const branch = visibleBranches.find((item) => item.id === group.key)
                const sourceCount = branch?.children.length ?? 0
                return (
                  <ModusWcMenuItem
                    key={group.key}
                    label={group.label}
                    value={group.key}
                    size="sm"
                    selected={selectedGroup?.key === group.key}
                    subLabel={`${group.remaining} remaining · ${group.total} total · ${sourceCount} Allyant source${sourceCount === 1 ? '' : 's'}`}
                    tooltipContent={
                      sourceCount > 1
                        ? `${group.label} — merged from ${sourceCount} Allyant labels`
                        : group.label
                    }
                    onItemSelect={() => selectGroup(group.key)}
                  >
                    <ModusWcIcon slot="start-icon" name="component" size="xs" decorative />
                  </ModusWcMenuItem>
                )
              })}
            </ModusWcMenu>
            </div>
          </ModusWcCard>
        </div>

        <div id="component-detail" className="app-component-detail-col" tabIndex={-1}>
          <div className={!selectedGroup ? 'app-is-hidden' : undefined} aria-hidden={!selectedGroup}>
            <ModusWcCard bordered={false} padding="compact">
              <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
                <ModusWcIcon name="dashboard" decorative />
                <h2 className="issues-heading !m-0 flex min-w-0 flex-wrap items-baseline gap-x-1">
                  <span>Issues for</span>
                  {selectedDocsUrl && selectedGroup ? (
                    <ModusWcLink
                      href={selectedDocsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      aria-label={`${selectedGroup.label} Modus documentation (opens in a new tab)`}
                    >
                      {selectedGroup.label}
                    </ModusWcLink>
                  ) : (
                    <span>{selectedGroup?.label ?? 'item'}</span>
                  )}
                  <span>
                    ({selectedIssueCount} across {selectedGroup?.total ?? 0} HUBs)
                  </span>
                </h2>
              </div>
              <IssueCardsGrid
                tickets={selectedGroup?.tickets ?? []}
                resetKey={`${extras.selected}|${searchParams.toString()}`}
                emptyLabel="No issues for this Modus group."
                onHubSelect={(hubId) => navigate(ticketDetailPath(hubId, componentsReturnTo))}
              />
            </ModusWcCard>
          </div>

          <div className={!selectedGroup ? 'app-is-hidden' : undefined} aria-hidden={!selectedGroup}>
            <ModusWcCard bordered={false} padding="compact" customClass="components-detail-card">
              <div
                slot="title"
                className={
                  team === 'modus'
                    ? 'flex w-full min-w-0 items-center justify-start gap-2 mb-4'
                    : 'flex w-full min-w-0 items-center justify-between gap-3 mb-4'
                }
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ModusWcIcon name="component" decorative />
                  <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Item detail" />
                </div>
                <div className="shrink-0" hidden={team === 'modus'}>
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
                    <ModusWcIcon name="dashboard" size="xs" decorative />
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
                      label={`${selectedGroup?.remaining ?? 0} tickets remaining of ${selectedGroup?.total ?? 0} total${
                        allyantSourceCount > 1
                          ? ` · merged from ${allyantSourceCount} Allyant sources`
                          : ''
                      }`}
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
