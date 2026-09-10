import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ComponentsPage from './pages/ComponentsPage'
import DashboardPage from './pages/DashboardPage'
import PagesPage from './pages/PagesPage'
import TicketDetailPage from './pages/TicketDetailPage'
import TicketsPage from './pages/TicketsPage'
import { TicketStoreProvider } from './store/TicketStore'

export default function App() {
  return (
    <TicketStoreProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/:hubId" element={<TicketDetailPage />} />
          <Route path="/components" element={<ComponentsPage />} />
          <Route path="/pages" element={<PagesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </TicketStoreProvider>
  )
}
