import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type AppTeam = 'modus' | 'unity'

const STORAGE_KEY = 'wcag-allyant-team'

type TeamContextValue = {
  team: AppTeam | null
  setTeam: (team: AppTeam) => void
}

const TeamContext = createContext<TeamContextValue | null>(null)

function readStoredTeam(): AppTeam | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    if (value === 'modus' || value === 'unity') return value
  } catch {
    /* ignore private-mode / storage errors */
  }
  return null
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeamState] = useState<AppTeam | null>(readStoredTeam)

  const setTeam = useCallback((next: AppTeam) => {
    setTeamState(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(() => ({ team, setTeam }), [team, setTeam])

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam(): TeamContextValue {
  const ctx = useContext(TeamContext)
  if (!ctx) {
    throw new Error('useTeam must be used within TeamProvider')
  }
  return ctx
}
