import type { LocalStatus } from '../types/ticket'
import { LOCAL_STATUS_LABEL } from '../types/ticket'

export function clampCellText(value: unknown): HTMLElement {
  const span = document.createElement('span')
  span.className = 'app-table-cell-clamp'
  span.textContent = value == null || value === '' ? '—' : String(value)
  return span
}

export function badgeCell(
  label: string,
  color: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'high-contrast',
): HTMLElement {
  const wrap = document.createElement('span')
  const badge = document.createElement('modus-wc-badge')
  badge.setAttribute('size', 'sm')
  badge.setAttribute('variant', 'filled')
  badge.setAttribute('color', color)
  badge.textContent = label
  wrap.appendChild(badge)
  return wrap
}

export function priorityBadgeColor(
  priority: string,
): 'danger' | 'warning' | 'default' {
  if (priority === 'Critical') return 'danger'
  if (priority === 'Serious') return 'warning'
  return 'default'
}

export function statusBadgeColor(
  status: LocalStatus,
): 'default' | 'primary' | 'success' | 'warning' {
  if (status === 'in_progress') return 'primary'
  if (status === 'resolved') return 'success'
  if (status === 'wont_fix') return 'warning'
  return 'default'
}

export function statusCell(status: LocalStatus): HTMLElement {
  return badgeCell(LOCAL_STATUS_LABEL[status], statusBadgeColor(status))
}

export function yesNoCell(value: boolean): HTMLElement {
  if (!value) {
    const span = document.createElement('span')
    span.textContent = '—'
    return span
  }
  return badgeCell('Yes', 'danger')
}
