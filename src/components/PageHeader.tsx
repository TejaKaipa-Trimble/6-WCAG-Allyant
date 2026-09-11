import {
  ModusWcBreadcrumbs,
  ModusWcButton,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { useNavigate } from 'react-router-dom'

type Crumb = { label: string; url?: string }

type PageHeaderProps = {
  title: string
  description?: string
  crumbs?: Crumb[]
  actions?: React.ReactNode
  compact?: boolean
  backTo?: string
  backLabel?: string
}

export default function PageHeader({
  title,
  description,
  crumbs,
  actions,
  compact = false,
  backTo,
  backLabel = 'Back',
}: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className={compact ? 'app-page-header app-page-header--compact' : 'app-page-header'}>
      {crumbs ? (
        <ModusWcBreadcrumbs
          aria-label="Page path"
          size="sm"
          items={crumbs}
          onBreadcrumbClick={(event: CustomEvent<Crumb>) => {
            if (event.detail.url) navigate(event.detail.url)
          }}
        />
      ) : null}
      <div className="app-page-header-row">
        <div className="app-page-header-lead">
          {backTo ? (
            <ModusWcButton
              variant="borderless"
              color="tertiary"
              shape="square"
              size={compact ? 'sm' : 'md'}
              buttonAriaLabel={backLabel}
              aria-label={backLabel}
              customClass="app-page-header-back"
              onButtonClick={() => navigate(backTo)}
            >
              <ModusWcIcon name="chevron_left" size={compact ? 'xs' : 'sm'} decorative />
            </ModusWcButton>
          ) : null}
          <div className="min-w-0">
            <ModusWcTypography
              hierarchy="h1"
              size={compact ? 'xl' : '2xl'}
              weight="bold"
              customClass="!m-0"
              label={title}
            />
            {description ? (
              <ModusWcTypography
                hierarchy="p"
                size={compact ? 'xs' : 'sm'}
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
                label={description}
              />
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </header>
  )
}
