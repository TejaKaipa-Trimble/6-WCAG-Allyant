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
import type { ISelectOption } from '@trimble-oss/moduswebcomponents'
import PageHeader from '../components/PageHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { buildTicketDetailCrumbs, isLocalStatus, ticketDetailPath } from '../lib/tickets'
import { useTicketStore } from '../store/TicketStore'
import { LOCAL_STATUS_LABEL, type LocalStatus } from '../types/ticket'
import { readInputString } from '../utils/modusFormEvents'

const STATUS_OPTIONS: ISelectOption[] = Object.entries(LOCAL_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
)

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
  const { tickets, getTicket, setStatus, setNotes, addComment } = useTicketStore()
  const ticket = getTicket(hubId)
  const [draftComment, setDraftComment] = useState('')
  const [draftNotes, setDraftNotes] = useState<string | null>(null)

  useEffect(() => {
    setDraftComment('')
    setDraftNotes(null)
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

  const notesValue = draftNotes ?? ticket.notes

  return (
    <div className="app-page">
      <PageHeader
        title={`HUB ${ticket.hubId}`}
        description={ticket.pageName}
        crumbs={buildTicketDetailCrumbs(ticket, returnTo)}
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

      <ModusWcCard bordered={false} padding="compact">
        <div slot="title" className="flex w-full min-w-0 items-center justify-between gap-3 mb-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ModusWcIcon name="clipboard" decorative />
            <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Ticket status" />
          </div>
        </div>
        <div className="app-card-body">
          <ModusWcSelect
            label="Local status"
            size="sm"
            value={ticket.status}
            options={STATUS_OPTIONS}
            onInputChange={(event: CustomEvent) => {
              const value = readInputString(event)
              if (isLocalStatus(value)) setStatus(ticket.hubId, value as LocalStatus)
            }}
          />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={`Allyant status: ${ticket.allyantStatus || '—'}${
              ticket.updatedAt ? ` · Last local update ${formatWhen(ticket.updatedAt)}` : ''
            }`}
          />
        </div>
      </ModusWcCard>

      <ModusWcCard bordered={false} padding="comfortable">
        <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
          <ModusWcIcon name="document" decorative />
          <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Issue" />
        </div>
        <div className="app-card-body">
          <ModusWcTypography
            hierarchy="p"
            size="md"
            customClass="app-prewrap"
            label={ticket.description}
          />
          <div className="app-meta-grid">
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

      <ModusWcCard bordered={false} padding="comfortable">
        <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
          <ModusWcIcon name="lightbulb_on" decorative />
          <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Recommended fix" />
        </div>
        <div className="app-card-body">
          <ModusWcTypography
            hierarchy="p"
            size="md"
            customClass="app-prewrap"
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

      <ModusWcCard bordered={false} padding="comfortable">
        <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
          <ModusWcIcon name="pencil" decorative />
          <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Local notes" />
        </div>
        <div className="app-card-body">
          <ModusWcTextarea
            label="Implementation notes"
            rows={5}
            value={notesValue}
            placeholder="What you tried, remaining risk, PR links…"
            onInputChange={(event: CustomEvent) => setDraftNotes(readInputString(event))}
          />
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="sm"
            onButtonClick={() => {
              setNotes(ticket.hubId, notesValue)
              setDraftNotes(null)
            }}
          >
            Save notes
          </ModusWcButton>
        </div>
      </ModusWcCard>

      <ModusWcCard bordered={false} padding="comfortable">
        <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
          <ModusWcIcon name="comment" decorative />
          <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label="Comments" />
        </div>
        <div className="app-card-body">
          <ul className="app-comment-list" hidden={ticket.comments.length === 0}>
            {ticket.comments.map((comment) => (
              <li key={comment.id}>
                <ModusWcTypography
                  hierarchy="p"
                  size="xs"
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={formatWhen(comment.createdAt)}
                />
                <ModusWcTypography hierarchy="p" size="sm" customClass="app-prewrap" label={comment.text} />
              </li>
            ))}
          </ul>
          <ModusWcTypography
            hidden={ticket.comments.length > 0}
            hierarchy="p"
            size="sm"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label="No comments yet. These stay in this browser."
          />
          <ModusWcTextarea
            label="Add a comment"
            rows={3}
            value={draftComment}
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
