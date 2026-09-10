import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'

type KpiCardProps = {
  label: string
  value: string
  icon: string
  hint?: string
  actionLabel?: string
  onAction?: () => void
}

export default function KpiCard({
  label,
  value,
  icon,
  hint,
  actionLabel,
  onAction,
}: KpiCardProps) {
  return (
    <ModusWcCard bordered={false} padding="compact">
      <div
        slot="title"
        className={`flex w-full min-w-0 items-center gap-3 mb-4 ${
          actionLabel ? 'justify-between' : 'justify-start'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ModusWcIcon name={icon} size="sm" decorative />
          <ModusWcTypography hierarchy="h2" size="md" weight="semibold" label={label} />
        </div>
        {actionLabel && onAction ? (
          <div className="shrink-0">
            <ModusWcButton
              variant="borderless"
              color="tertiary"
              size="xs"
              onButtonClick={onAction}
            >
              {actionLabel}
            </ModusWcButton>
          </div>
        ) : null}
      </div>
      <div className="app-card-body">
        <ModusWcTypography hierarchy="p" size="2xl" weight="bold" label={value} />
        {hint ? (
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={hint}
          />
        ) : null}
      </div>
    </ModusWcCard>
  )
}
