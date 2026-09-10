import {
  ModusWcBreadcrumbs,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { useNavigate } from 'react-router-dom'

type Crumb = { label: string; url?: string }

type PageHeaderProps = {
  title: string
  description?: string
  crumbs?: Crumb[]
  actions?: React.ReactNode
}

export default function PageHeader({ title, description, crumbs, actions }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="app-page-header">
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
        <div className="min-w-0">
          <ModusWcTypography hierarchy="h1" size="2xl" weight="bold" label={title} />
          {description ? (
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !mt-1"
              label={description}
            />
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
