import {
  ModusWcBadge,
  ModusWcButton,
  ModusWcCard,
  ModusWcChip,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { CommonIssueGroup } from '../lib/tickets'
import { useTeam } from '../store/TeamStore'
import { LOCAL_STATUS_LABEL } from '../types/ticket'
import { priorityBadgeColor, statusBadgeColor } from '../utils/tableCells'

type IssueCardProps = {
  group: CommonIssueGroup
  onHubSelect: (hubId: string) => void
  onViewIssue: (hubId: string) => void
}

function formatList(values: string[], limit = 3): string {
  if (values.length === 0) return '—'
  if (values.length <= limit) return values.join(', ')
  return `${values.slice(0, limit).join(', ')} (+${values.length - limit} more)`
}

export default function IssueCard({ group, onHubSelect, onViewIssue }: IssueCardProps) {
  const { team } = useTeam()
  const primaryHubId = group.hubIds[0]
  const showHubIds = team !== 'modus'

  return (
    <ModusWcCard bordered={false} padding="compact" customClass="issue-card">
      <div className="issue-card-row">
        <div className="issue-card-main">
          <div className="issue-card-badges">
            <ModusWcBadge variant="filled" color={priorityBadgeColor(group.priority)} size="sm">
              {group.priority || '—'}
            </ModusWcBadge>
            <ModusWcBadge variant="filled" color={statusBadgeColor(group.status)} size="sm">
              {LOCAL_STATUS_LABEL[group.status]}
            </ModusWcBadge>
            {group.highRisk ? (
              <ModusWcBadge variant="filled" color="danger" size="sm">
                High risk
              </ModusWcBadge>
            ) : null}
          </div>

          <ModusWcTypography
            hierarchy="h3"
            size="md"
            weight="semibold"
            customClass="!m-0"
            label={group.description || 'Untitled issue'}
          />

          <div className="issue-card-meta">
            {group.wcag ? (
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
                label={group.wcag}
              />
            ) : null}
            {group.category ? (
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
                label={group.category}
              />
            ) : null}
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
              label={`Pages: ${formatList(group.pages)}`}
            />
          </div>

          <div
            className="issue-card-hubs"
            role="group"
            aria-label={`HUB IDs for ${group.description || 'issue'}`}
            hidden={!showHubIds}
          >
            <div className="issue-card-hubs-header">
              <ModusWcTypography
                hierarchy="p"
                size="xs"
                weight="semibold"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0 shrink-0"
                label="HUB IDs"
              />
              {group.hubIds.length > 1 ? (
                <ModusWcBadge variant="filled" color="high-contrast" size="sm">
                  {group.hubIds.length} HUBs
                </ModusWcBadge>
              ) : null}
            </div>
            <div className="app-chip-row">
              {group.hubIds.map((hubId) => (
                <ModusWcChip
                  key={hubId}
                  label={hubId}
                  size="sm"
                  variant="outline"
                  onChipClick={() => onHubSelect(hubId)}
                  aria-label={`Open HUB ${hubId}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="issue-card-actions">
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="sm"
            disabled={!primaryHubId}
            onButtonClick={() => {
              if (primaryHubId) onViewIssue(primaryHubId)
            }}
          >
            View Issue
          </ModusWcButton>
        </div>
      </div>
    </ModusWcCard>
  )
}
