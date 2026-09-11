import { ModusWcIcon, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'

type ComponentStatTileProps = {
  label: string
  value: string
  icon: string
  tone?: 'default' | 'primary' | 'danger' | 'warning' | 'success'
}

const toneClass: Record<NonNullable<ComponentStatTileProps['tone']>, string> = {
  default: 'components-stat-tile--default',
  primary: 'components-stat-tile--primary',
  danger: 'components-stat-tile--danger',
  warning: 'components-stat-tile--warning',
  success: 'components-stat-tile--success',
}

export default function ComponentStatTile({
  label,
  value,
  icon,
  tone = 'default',
}: ComponentStatTileProps) {
  return (
    <div className={`components-stat-tile ${toneClass[tone]}`}>
      <div className="components-stat-tile__icon-well" aria-hidden="true">
        <ModusWcIcon name={icon} size="sm" decorative />
      </div>
      <div className="components-stat-tile__copy min-w-0">
        <ModusWcTypography
          hierarchy="p"
          size="xs"
          weight="semibold"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)] !m-0"
          label={label}
        />
        <ModusWcTypography
          hierarchy="p"
          size="lg"
          weight="bold"
          customClass="!m-0 tabular-nums"
          label={value}
        />
      </div>
    </div>
  )
}
