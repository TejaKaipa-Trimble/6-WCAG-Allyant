import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcLink,
  ModusWcSelect,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import PageHeader from '../components/PageHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  backLabelForPath,
  buildTicketDetailCrumbs,
  isLocalStatus,
  relatedHubIds,
  resolveBackPath,
  ticketDetailPath,
} from '../lib/tickets'
import { useTicketStore } from '../store/TicketStore'
import { LOCAL_STATUS_OPTIONS, type LocalStatus } from '../types/ticket'
import { readInputString } from '../utils/modusFormEvents'

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function TicketDetailPage() {
  const { hubId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const returnTo = searchParams.get('returnTo')
  const backTo = resolveBackPath(returnTo)
  const { tickets, getTicket, setStatus, addComment } = useTicketStore()
  const ticket = getTicket(hubId)
  const [draftComment, setDraftComment] = useState('')

  useEffect(() => {
    setDraftComment('')
  }, [hubId])

  useDocumentTitle(
    ticket ? `HUB ${ticket.hubId} — WCAG Allyant` : 'Ticket — WCAG Allyant',
  )

  const siblings = useMemo(() => {
    if (!ticket) return []
    return tickets.filter((item) => item.pageName === ticket.pageName)
  }, [ticket, tickets])

  const siblingIndex = siblings.findIndex((item) => item.hubId === hubId)
  const previous = siblingIndex > 0 ? siblings[siblingIndex - 1] : undefined
  const next =
    siblingIndex >= 0 && siblingIndex < siblings.length - 1
      ? siblings[siblingIndex + 1]
      : undefined

  if (!ticket) {
    return (
      <div className="app-page">
        <PageHeader
          title="Ticket not found"
          backTo={backTo}
          backLabel={backLabelForPath(backTo)}
          crumbs={
            returnTo?.startsWith('/components')
              ? [{ label: 'Components', url: returnTo }, { label: 'Missing' }]
              : [{ label: 'Tickets', url: '/tickets' }, { label: 'Missing' }]
          }
        />
        <ModusWcAlert
          variant="warning"
          alertTitle="No matching HUB ID"
          alertDescription="That ticket is not in the imported Allyant export."
        />
      </div>
    )
  }

  const relatedCount = relatedHubIds(ticket.hubId).length
  const statusHelp =
    relatedCount > 1
      ? `Shared with Modus and Unity. Changing this updates all ${relatedCount} HUB tickets with the same finding on this Modus component.`
      : 'Shared with Modus and Unity — both teams see the same status.'

  return (
    <div className="app-page ticket-detail-page">
      <PageHeader
        title={`HUB ${ticket.hubId}`}
        description={ticket.pageName}
        backTo={backTo}
        backLabel={backLabelForPath(backTo)}
        crumbs={buildTicketDetailCrumbs(ticket, returnTo)}
        compact
        actions={
          <>
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              disabled={!previous}
              onButtonClick={() => previous && navigate(ticketDetailPath(previous.hubId, returnTo))}
            >
              Previous on page
            </ModusWcButton>
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              disabled={!next}
              onButtonClick={() => next && navigate(ticketDetailPath(next.hubId, returnTo))}
            >
              Next on page
            </ModusWcButton>
          </>
        }
      />

      <section className="ticket-status-bar" aria-label="Ticket status">
        <div className="ticket-status-bar__row">
          <div className="ticket-status-bar__title">
            <ModusWcIcon name="clipboard" decorative />
            <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Ticket status" />
          </div>
          <ModusWcSelect
            size="sm"
            value={ticket.status}
            options={LOCAL_STATUS_OPTIONS}
            aria-label="Status"
            customClass="ticket-status-bar__select"
            onInputChange={(event: CustomEvent) => {
              const value = readInputString(event)
              if (isLocalStatus(value)) setStatus(ticket.hubId, value as LocalStatus)
            }}
          />
        </div>
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
          label={statusHelp}
        />
        <ModusWcTypography
          hierarchy="p"
          size="xs"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
          label={`Allyant export status: ${ticket.allyantStatus || '—'}${
            ticket.updatedAt ? ` · Last tracker update ${formatWhen(ticket.updatedAt)}` : ''
          }`}
        />
      </section>

      <div className="ticket-detail-split">
        <div className="ticket-detail-main">
          <ModusWcCard bordered={false} padding="compact">
            <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
              <ModusWcIcon name="document" decorative />
              <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Issue" />
            </div>
            <div className="app-card-body">
              <ModusWcTypography
                hierarchy="p"
                size="md"
                customClass="app-prewrap !m-0"
                label={ticket.description}
              />
              <div className="ticket-meta-stack">
                <Meta label="Affected item" value={ticket.affectedItem} />
                <Meta label="Additional elements" value={ticket.additionalElements} />
                <Meta label="Component" value={ticket.component} />
                <Meta label="Priority" value={ticket.priority} />
                <Meta label="Category" value={ticket.category} />
                <Meta label="WCAG" value={ticket.wcag} />
                <Meta label="Affected users" value={ticket.affectedUsers} />
                <Meta label="High risk" value={ticket.highRisk ? 'Yes' : 'No'} />
                <Meta label="Sitewide" value={ticket.sitewide ? 'Yes' : 'No'} />
                <Meta label="Common issue ID" value={ticket.commonIssueId} />
                <Meta label="Allyant last comment" value={ticket.lastComment} />
              </div>
              {ticket.location ? (
                <ModusWcLink
                  href={ticket.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                >
                  Open affected URL
                </ModusWcLink>
              ) : null}
            </div>
          </ModusWcCard>

          <ModusWcCard bordered={false} padding="compact">
            <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
              <ModusWcIcon name="lightbulb_on" decorative />
              <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Recommended fix" />
            </div>
            <div className="app-card-body">
              <ModusWcTypography
                hierarchy="p"
                size="md"
                customClass="app-prewrap !m-0"
                label={ticket.recommendedFix || 'No recommended fix in the export.'}
              />
            </div>
          </ModusWcCard>

          <ModusWcCard bordered={false} padding="compact">
            <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
              <ModusWcIcon name="link" decorative />
              <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="References" />
            </div>
            <div className="app-card-body">
              <ul className="app-link-list">
                {ticket.issueLink ? (
                  <li>
                    <ModusWcLink
                      href={ticket.issueLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                    >
                      Allyant issue
                    </ModusWcLink>
                  </li>
                ) : null}
                {ticket.screenshots.map((url, index) => (
                  <li key={url}>
                    <ModusWcLink href={url} target="_blank" rel="noopener noreferrer" underline="hover">
                      {ticket.screenshots.length === 1 ? 'Screenshot' : `Screenshot ${index + 1}`}
                    </ModusWcLink>
                  </li>
                ))}
                {ticket.kbArticles.map((url, index) => (
                  <li key={url}>
                    <ModusWcLink href={url} target="_blank" rel="noopener noreferrer" underline="hover">
                      Knowledge base {index + 1}
                    </ModusWcLink>
                  </li>
                ))}
              </ul>
              {!ticket.issueLink && ticket.screenshots.length === 0 && ticket.kbArticles.length === 0 ? (
                <ModusWcTypography hierarchy="p" size="sm" label="No external links in the export." />
              ) : null}
            </div>
          </ModusWcCard>
        </div>

        <aside className="ticket-detail-aside">
          <ModusWcCard bordered={false} padding="compact" customClass="ticket-comments-card">
            <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
              <ModusWcIcon name="comment" decorative />
              <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Comments" />
            </div>
            <div className="app-card-body ticket-comments-body">
              <ul className="app-comment-list" hidden={ticket.comments.length === 0}>
                {ticket.comments.map((comment) => (
                  <li key={comment.id}>
                    <ModusWcTypography
                      hierarchy="p"
                      size="xs"
                      customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
                      label={formatWhen(comment.createdAt)}
                    />
                    <ModusWcTypography
                      hierarchy="p"
                      size="sm"
                      customClass="app-prewrap !m-0"
                      label={comment.text}
                    />
                  </li>
                ))}
              </ul>
              <ModusWcTypography
                hidden={ticket.comments.length > 0}
                hierarchy="p"
                size="sm"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
                label="No comments yet. Use comments to track notes on this finding."
              />
              <ModusWcTextarea
                label="Add a comment"
                rows={4}
                value={draftComment}
                placeholder="Progress notes, PR links, remaining risk…"
                onInputChange={(event: CustomEvent) => setDraftComment(readInputString(event))}
              />
              <ModusWcButton
                variant="filled"
                color="primary"
                size="sm"
                onButtonClick={() => {
                  addComment(ticket.hubId, draftComment)
                  setDraftComment('')
                }}
              >
                <ModusWcIcon name="add" size="xs" decorative />
                Add comment
              </ModusWcButton>
            </div>
          </ModusWcCard>
        </aside>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="ticket-meta-row">
      <ModusWcTypography
        hierarchy="p"
        size="xs"
        weight="semibold"
        customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
        label={label}
      />
      <ModusWcTypography hierarchy="p" size="sm" customClass="app-prewrap !m-0" label={value || '—'} />
    </div>
  )
}
