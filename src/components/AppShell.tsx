import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ModusWcAlert,
  ModusWcIcon,
  ModusWcMenu,
  ModusWcMenuItem,
  ModusWcNavbar,
  ModusWcSideNavigation,
  ModusWcThemeSwitcher,
  ModusWcToast,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import {
  APP_SHELL_ROOT_CLASS,
  MAIN_CONTENT_ID,
  MAIN_CONTENT_SELECTOR,
  NAVBAR_WIDE_MQ,
  PUSH_LAYOUT_MQ,
  SIDE_NAV_MAX_WIDTH,
  SIDE_NAV_MIN_WIDTH,
  XL_EXPANDED_MQ,
} from '../constants/shellLayout'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useTeam } from '../store/TeamStore'
import { useTicketStore } from '../store/TicketStore'

type NavItem = {
  value: string
  label: string
  icon: string
  path: string
  match: 'exact' | 'tickets' | 'components' | 'pages' | 'prefix'
}

const NAV_ITEMS: NavItem[] = [
  { value: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/', match: 'exact' },
  { value: 'tickets', label: 'All tickets', icon: 'table', path: '/tickets', match: 'tickets' },
  {
    value: 'components',
    label: 'Components',
    icon: 'component',
    path: '/components',
    match: 'components',
  },
  { value: 'pages', label: 'Pages', icon: 'folder_closed', path: '/pages', match: 'pages' },
  {
    value: 'critical',
    label: 'Critical',
    icon: 'alert',
    path: '/tickets?priority=Critical',
    match: 'prefix',
  },
  {
    value: 'high-risk',
    label: 'High risk',
    icon: 'warning',
    path: '/tickets?highRisk=yes',
    match: 'prefix',
  },
  {
    value: 'in-progress',
    label: 'In progress',
    icon: 'hourglass',
    path: '/tickets?status=in_progress',
    match: 'prefix',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    icon: 'check_circle',
    path: '/tickets?status=resolved',
    match: 'prefix',
  },
]

const USER_CARD = {
  name: 'Accessibility engineer',
  email: 'wcag.allyant@local',
  avatarAlt: 'Accessibility engineer',
}

function ticketListNavValue(search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (params.get('priority') === 'Critical' && [...params.keys()].length === 1) {
    return 'critical'
  }
  if (params.get('highRisk') === 'yes' && [...params.keys()].length === 1) {
    return 'high-risk'
  }
  if (params.get('status') === 'in_progress' && [...params.keys()].length === 1) {
    return 'in-progress'
  }
  if (params.get('status') === 'resolved' && [...params.keys()].length === 1) {
    return 'resolved'
  }
  return 'tickets'
}

function navValueFromReturnTo(returnTo: string | null): string | null {
  if (!returnTo) return null
  if (returnTo.startsWith('/components')) return 'components'
  if (returnTo.startsWith('/pages')) return 'pages'
  if (returnTo === '/' || returnTo.startsWith('/?')) return 'dashboard'
  if (returnTo.startsWith('/tickets')) {
    const queryIndex = returnTo.indexOf('?')
    return ticketListNavValue(queryIndex === -1 ? '' : returnTo.slice(queryIndex))
  }
  return null
}

function activeNavValue(pathname: string, search: string): string {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/pages')) return 'pages'
  if (pathname.startsWith('/components')) return 'components'
  if (pathname.startsWith('/tickets/')) {
    const fromReturnTo = navValueFromReturnTo(new URLSearchParams(search).get('returnTo'))
    if (fromReturnTo) return fromReturnTo
    return 'tickets'
  }
  if (pathname === '/tickets') return ticketListNavValue(search)
  return 'dashboard'
}

type AppShellProps = {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { team } = useTeam()
  const { syncError } = useTicketStore()
  const hideSideNav = team === 'modus'
  const navItems = hideSideNav ? NAV_ITEMS.filter((item) => item.value === 'components') : NAV_ITEMS
  const isDesktop = useMediaQuery(PUSH_LAYOUT_MQ)
  const isXl = useMediaQuery(XL_EXPANDED_MQ)
  const isNavbarWide = useMediaQuery(NAVBAR_WIDE_MQ)

  const [sideNavExpanded, setSideNavExpanded] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(XL_EXPANDED_MQ).matches,
  )
  const [toast, setToast] = useState<string | null>(null)

  const shellRef = useRef<HTMLDivElement>(null)
  const navbarRef = useRef<(HTMLElement & { mainMenuOpen?: boolean }) | null>(null)
  const railWrapperRef = useRef<HTMLDivElement>(null)

  const mode = isDesktop ? 'push' : 'overlay'
  const selected = activeNavValue(location.pathname, location.search)

  const shellModeClass = useMemo(() => {
    if (hideSideNav) return 'side-nav-hidden'
    if (!isDesktop) {
      return sideNavExpanded ? 'side-nav-overlay-open' : 'side-nav-overlay-collapsed'
    }
    return sideNavExpanded ? 'side-nav-push-expanded' : 'side-nav-push-collapsed'
  }, [hideSideNav, isDesktop, sideNavExpanded])

  useEffect(() => {
    if (hideSideNav) {
      setSideNavExpanded(false)
      return
    }
    setSideNavExpanded(isXl)
  }, [hideSideNav, isXl])

  useEffect(() => {
    document.getElementById(MAIN_CONTENT_ID)?.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  useEffect(() => {
    if (hideSideNav || isDesktop) return undefined
    const id = requestAnimationFrame(() => setSideNavExpanded(false))
    return () => cancelAnimationFrame(id)
  }, [hideSideNav, isDesktop, location.pathname, location.search])

  useLayoutEffect(() => {
    const navbar = navbarRef.current
    const shell = shellRef.current
    if (!navbar || !shell) return

    const apply = () => {
      const height = Math.round(navbar.getBoundingClientRect().height || 56)
      shell.style.setProperty('--app-navbar-height', `${height}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(navbar)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const main = document.getElementById(MAIN_CONTENT_ID)
    if (!main) return

    if (hideSideNav || !isDesktop) {
      main.style.removeProperty('margin-left')
      return
    }

    const target = sideNavExpanded ? SIDE_NAV_MAX_WIDTH : SIDE_NAV_MIN_WIDTH
    main.style.marginLeft = target
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        main.style.marginLeft = target
      })
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [hideSideNav, isDesktop, sideNavExpanded])

  useLayoutEffect(() => {
    const wrapper = railWrapperRef.current
    if (!wrapper) return
    const overlayCollapsed = hideSideNav || (!isDesktop && !sideNavExpanded)
    if (overlayCollapsed && wrapper.contains(document.activeElement)) {
      document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true })
    }
    wrapper.inert = overlayCollapsed
  }, [hideSideNav, isDesktop, sideNavExpanded, location.pathname])

  useEffect(() => {
    const host = navbarRef.current
    if (!host) return
    const id = window.setTimeout(() => {
      host.mainMenuOpen = hideSideNav || isDesktop ? false : sideNavExpanded
    }, 0)
    return () => window.clearTimeout(id)
  }, [hideSideNav, isDesktop, sideNavExpanded, location.pathname])

  const handleMainMenuOpenChange = useCallback(
    (event: CustomEvent<boolean>) => {
      if (hideSideNav) return
      if (isDesktop) {
        setSideNavExpanded((current) => !current)
        return
      }
      setSideNavExpanded(Boolean(event.detail))
    },
    [hideSideNav, isDesktop],
  )

  const visibility = useMemo(
    () => ({
      mainMenu: !hideSideNav,
      apps: isNavbarWide,
      search: !hideSideNav && isNavbarWide,
      searchInput: false,
      notifications: isNavbarWide,
      help: isNavbarWide,
      user: true,
      ai: false,
      logo: true,
    }),
    [hideSideNav, isNavbarWide],
  )

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3200)
  }

  return (
    <div ref={shellRef} className={`${APP_SHELL_ROOT_CLASS} ${shellModeClass}`}>
      <a className="skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <ModusWcNavbar
        ref={(el) => {
          navbarRef.current = el as unknown as (HTMLElement & { mainMenuOpen?: boolean }) | null
        }}
        visibility={visibility}
        condensed={!isNavbarWide}
        mainMenuOpen={hideSideNav || isDesktop ? false : sideNavExpanded}
        onMainMenuOpenChange={handleMainMenuOpenChange}
        userCard={USER_CARD}
        customClass="sticky top-0 z-[120] flex-shrink-0"
        onSearchClick={() => {
          if (team === 'modus') return
          navigate('/tickets')
        }}
        onSearchChange={(event: CustomEvent<{ value: string }>) => {
          const value = event.detail?.value ?? ''
          navigate(value ? `/tickets?q=${encodeURIComponent(value)}` : '/tickets')
        }}
        onAppsClick={() => showToast('Apps launcher is not wired in this local tracker.')}
        onNotificationsClick={() => showToast('No notifications in the local prototype.')}
        onHelpClick={() =>
          showToast('Status and comments sync to the wcag_allyant Supabase tables.')
        }
        onTrimbleLogoClick={() => navigate(team === 'modus' ? '/components' : '/')}
      >
        <div slot="start" className="flex min-w-0 items-center">
          <ModusWcTypography hierarchy="p" size="md" weight="semibold" label="WCAG Allyant" />
        </div>
        <div
          slot="center"
          hidden={!isNavbarWide}
          className={isNavbarWide ? 'flex min-w-0 items-center gap-2' : undefined}
        >
          <ModusWcTypography
            hierarchy="p"
            size="md"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label="Unity Construct 2025 audit"
          />
        </div>
        <div slot="end" className="flex items-center">
          <ModusWcThemeSwitcher aria-label="Toggle light and dark theme" />
        </div>
      </ModusWcNavbar>

      <div className="app-body-row">
        {hideSideNav ? null : (
          <div ref={railWrapperRef} className="side-rail-wrapper">
            <ModusWcSideNavigation
              key={mode}
              expanded={sideNavExpanded}
              mode={mode}
              maxWidth={SIDE_NAV_MAX_WIDTH}
              targetContent={MAIN_CONTENT_SELECTOR}
              collapseOnClickOutside={!isDesktop}
              onExpandedChange={(event: CustomEvent<boolean>) => {
                setSideNavExpanded(Boolean(event.detail))
              }}
            >
              <ModusWcMenu size="md" customClass="w-full" aria-label="Primary navigation">
                {navItems.map((item) => (
                  <ModusWcMenuItem
                    key={item.value}
                    label={item.label}
                    value={item.value}
                    selected={selected === item.value}
                    onItemSelect={() => navigate(item.path)}
                  >
                    <ModusWcIcon slot="start-icon" name={item.icon} size="md" decorative />
                  </ModusWcMenuItem>
                ))}
              </ModusWcMenu>
            </ModusWcSideNavigation>
          </div>
        )}

        <main id={MAIN_CONTENT_ID} className="page-main" tabIndex={-1}>
          {syncError ? (
            <div className="w-full max-w-7xl mx-auto min-w-0 px-4 pt-4">
              <ModusWcAlert
                variant="error"
                alertTitle="Could not sync progress"
                alertDescription={syncError}
              />
            </div>
          ) : null}
          {children}
        </main>
      </div>

      {toast ? (
        <div className="app-toast-host" aria-live="polite">
          <ModusWcToast position="top-end" delay={3200}>
            <ModusWcAlert
              variant="info"
              alertTitle={toast}
              dismissible
              onDismissClick={() => setToast(null)}
            />
          </ModusWcToast>
        </div>
      ) : null}
    </div>
  )
}
