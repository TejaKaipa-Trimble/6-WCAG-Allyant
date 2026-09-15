/**
 * Official Modus component names from https://modus.trimble.com/components
 * (companion index: https://modus.trimble.com/modus-llm/_index.json).
 * Allyant audit labels are nested under these parents; unmatched names go to Other.
 */
export type ModusCatalogEntry = {
  slug: string
  title: string
  aliases?: string[]
}

export const OTHER_MODUS_SLUG = 'other'
export const OTHER_MODUS_TITLE = 'Other'
export const MODUS_PARENT_PREFIX = 'modus:'

export function modusParentId(slug: string): string {
  return `${MODUS_PARENT_PREFIX}${slug}`
}

export function isModusParentId(id: string): boolean {
  return id.startsWith(MODUS_PARENT_PREFIX)
}

export function modusSlugFromParentId(id: string): string | null {
  if (!isModusParentId(id)) return null
  return id.slice(MODUS_PARENT_PREFIX.length)
}

/** Official Modus Blueprint component docs URL, or null for non-catalog / Other. */
export function modusComponentDocsUrl(slug: string): string | null {
  if (!slug || slug === OTHER_MODUS_SLUG) return null
  if (!MODUS_CATALOG.some((entry) => entry.slug === slug)) return null
  return `https://modus.trimble.com/components/web/${slug}/`
}

export const MODUS_CATALOG: readonly ModusCatalogEntry[] = [
  { slug: 'accordion', title: 'Accordion' },
  { slug: 'alert', title: 'Alert', aliases: ['banner', 'alert banner'] },
  { slug: 'app-menu', title: 'App menu' },
  { slug: 'autocomplete', title: 'Autocomplete', aliases: ['search'] },
  { slug: 'avatar', title: 'Avatar' },
  { slug: 'badge', title: 'Badge' },
  { slug: 'bottom-sheet', title: 'Bottom sheet' },
  { slug: 'breadcrumbs', title: 'Breadcrumbs' },
  { slug: 'browser-mockup', title: 'Browser mockup' },
  { slug: 'button', title: 'Button', aliases: ['export'] },
  { slug: 'button-group', title: 'Button group' },
  { slug: 'calendar', title: 'Calendar', aliases: ['calendars'] },
  { slug: 'card', title: 'Card' },
  { slug: 'chat-bubble', title: 'Chat bubble' },
  { slug: 'checkbox', title: 'Checkbox' },
  { slug: 'chip', title: 'Chip' },
  { slug: 'collapse', title: 'Collapse' },
  {
    slug: 'content-tree',
    title: 'Content tree',
    aliases: ['tree view', 'tree', 'explorer', 'folders'],
  },
  { slug: 'countdown', title: 'Countdown' },
  { slug: 'date', title: 'Date', aliases: ['dates'] },
  { slug: 'divider', title: 'Divider' },
  { slug: 'dock', title: 'Dock' },
  { slug: 'drawer', title: 'Drawer' },
  { slug: 'dropdown-menu', title: 'Dropdown menu', aliases: ['more options'] },
  { slug: 'fieldset', title: 'Fieldset' },
  {
    slug: 'file-dropzone',
    title: 'File dropzone',
    aliases: ['attach document', 'attach'],
  },
  { slug: 'filter', title: 'Filter', aliases: ['filters'] },
  { slug: 'footer', title: 'Footer' },
  { slug: 'handle', title: 'Handle' },
  { slug: 'hero', title: 'Hero' },
  { slug: 'icon', title: 'Icon' },
  { slug: 'input-feedback', title: 'Input feedback' },
  { slug: 'kbd', title: 'Kbd' },
  { slug: 'label', title: 'Label' },
  { slug: 'link', title: 'Link' },
  { slug: 'list', title: 'List' },
  { slug: 'loader', title: 'Loader' },
  { slug: 'logo', title: 'Logo' },
  { slug: 'menu', title: 'Menu', aliases: ['navigation items', 'nav items'] },
  { slug: 'menu-item', title: 'Menu item' },
  { slug: 'modal', title: 'Modal', aliases: ['modals', 'confirm action'] },
  { slug: 'navbar', title: 'Navbar', aliases: ['header'] },
  { slug: 'number-input', title: 'Number input' },
  { slug: 'pagination', title: 'Pagination' },
  { slug: 'panel', title: 'Panel' },
  { slug: 'phone-mockup', title: 'Phone mockup' },
  { slug: 'profile-menu', title: 'Profile menu' },
  { slug: 'progress', title: 'Progress' },
  { slug: 'radio', title: 'Radio' },
  { slug: 'rating', title: 'Rating' },
  { slug: 'select', title: 'Select' },
  { slug: 'side-navigation', title: 'Side navigation', aliases: ['side nav'] },
  { slug: 'skeleton', title: 'Skeleton' },
  { slug: 'slider', title: 'Slider' },
  { slug: 'stat', title: 'Stat' },
  { slug: 'status', title: 'Status' },
  { slug: 'stepper', title: 'Stepper', aliases: ['wizard'] },
  { slug: 'swap', title: 'Swap' },
  { slug: 'switch', title: 'Switch' },
  { slug: 'table', title: 'Table', aliases: ['tables'] },
  { slug: 'tabs', title: 'Tabs' },
  { slug: 'text-input', title: 'Text input' },
  { slug: 'textarea', title: 'Textarea', aliases: ['notes'] },
  { slug: 'themeswitcher', title: 'ThemeSwitcher' },
  { slug: 'time-input', title: 'Time input' },
  { slug: 'timeline', title: 'Timeline' },
  { slug: 'toast', title: 'Toast' },
  { slug: 'toolbar', title: 'Toolbar' },
  { slug: 'tooltip', title: 'Tooltip' },
  { slug: 'tree-item', title: 'Tree item' },
  { slug: 'tree-menu', title: 'Tree menu' },
  { slug: 'typography', title: 'Typography' },
  { slug: 'utility-panel', title: 'Utility panel' },
  { slug: 'widget', title: 'Widget' },
  { slug: 'window-mockup', title: 'Window mockup' },
]

export type ModusParentRef = {
  slug: string
  title: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeHaystack(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function phrasesFor(entry: ModusCatalogEntry): string[] {
  const raw = [entry.title, entry.slug.replace(/-/g, ' '), ...(entry.aliases ?? [])]
  return [...new Set(raw.map((phrase) => phrase.toLowerCase().trim()).filter(Boolean))]
}

function skipMatch(entry: ModusCatalogEntry, fullHaystack: string): boolean {
  if (entry.slug === 'select' && /\bdates?\b/.test(fullHaystack)) return true
  if (entry.slug === 'footer' && /\btables?\b/.test(fullHaystack)) return true
  if (entry.slug === 'menu' && /\bside\s+nav/.test(fullHaystack)) return true
  if (entry.slug === 'status' && /\balert\b/.test(fullHaystack)) return true
  if (entry.slug === 'tree-item' || entry.slug === 'tree-menu') return true
  return false
}

function bestCatalogMatch(haystack: string, fullHaystack: string): ModusCatalogEntry | undefined {
  let best: { entry: ModusCatalogEntry; length: number } | undefined
  for (const entry of MODUS_CATALOG) {
    if (skipMatch(entry, fullHaystack)) continue
    for (const phrase of phrasesFor(entry)) {
      const pattern = new RegExp(`\\b${escapeRegExp(phrase).replace(/ /g, '\\s+')}\\b`)
      if (!pattern.test(haystack)) continue
      if (!best || phrase.length > best.length) {
        best = { entry, length: phrase.length }
      }
    }
  }
  return best?.entry
}

function labelSegments(label: string): string[] {
  return label
    .split(/\s*(?:>|:|\/| - )\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function matchModusCatalog(label: string): ModusParentRef {
  const trimmed = label.trim()
  if (!trimmed) return { slug: OTHER_MODUS_SLUG, title: OTHER_MODUS_TITLE }

  const fullHaystack = normalizeHaystack(trimmed)
  const segments = labelSegments(trimmed)
  const last = segments[segments.length - 1] ?? trimmed
  const lastHit = bestCatalogMatch(normalizeHaystack(last), fullHaystack)
  if (lastHit) return { slug: lastHit.slug, title: lastHit.title }

  const fullHit = bestCatalogMatch(fullHaystack, fullHaystack)
  if (fullHit) return { slug: fullHit.slug, title: fullHit.title }

  return { slug: OTHER_MODUS_SLUG, title: OTHER_MODUS_TITLE }
}
