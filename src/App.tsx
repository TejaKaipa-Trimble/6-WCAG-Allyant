import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ComponentsPage from './pages/ComponentsPage'
import DashboardPage from './pages/DashboardPage'
import PagesPage from './pages/PagesPage'
import TeamGatePage from './pages/TeamGatePage'
import TicketDetailPage from './pages/TicketDetailPage'
import TicketsPage from './pages/TicketsPage'
import { TeamProvider, useTeam } from './store/TeamStore'
import { TicketStoreProvider } from './store/TicketStore'

function AppRoutes() {
  const { team } = useTeam()

  if (team === 'modus') {
    return (
      <Routes>
        <Route path="/components" element={<ComponentsPage />} />
        <Route path="/tickets/:hubId" element={<TicketDetailPage />} />
        <Route path="*" element={<Navigate to="/components" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/tickets" element={<TicketsPage />} />
      <Route path="/tickets/:hubId" element={<TicketDetailPage />} />
      <Route path="/components" element={<ComponentsPage />} />
      <Route path="/pages" element={<PagesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AppTree() {
  const { team } = useTeam()

  if (!team) {
    return <TeamGatePage />
  }

  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  )
}

export default function App() {
  return (
    <TeamProvider>
      <TicketStoreProvider>
        <AppTree />
      </TicketStoreProvider>
    </TeamProvider>
  )
}
