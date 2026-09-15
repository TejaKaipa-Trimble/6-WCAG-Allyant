import { ModusWcButton, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import { useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { type AppTeam, useTeam } from '../store/TeamStore'

export default function TeamGatePage() {
  const { setTeam } = useTeam()
  const navigate = useNavigate()
  useDocumentTitle('Choose your team — WCAG Allyant')

  const choose = (team: AppTeam) => {
    setTeam(team)
    navigate(team === 'modus' ? '/components' : '/', { replace: true })
  }

  return (
    <main className="team-gate" id="main-content" tabIndex={-1}>
      <div className="team-gate-stack">
        <ModusWcTypography
          hierarchy="h1"
          size="2xl"
          weight="semibold"
          label="Choose your team to continue."
          customClass="team-gate-title !m-0 text-center"
        />
        <div className="team-gate-actions">
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="lg"
            customClass="team-gate-choice"
            onButtonClick={() => choose('modus')}
          >
            Modus Team
          </ModusWcButton>
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="lg"
            customClass="team-gate-choice"
            onButtonClick={() => choose('unity')}
          >
            Trimble Unity Team
          </ModusWcButton>
        </div>
      </div>
    </main>
  )
}
