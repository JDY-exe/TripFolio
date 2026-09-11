import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import PageIntro from '../components/PageIntro'
import BottomNav from '../components/navigation/BottomNav'
import {
  tripNavItems,
  type TripSection,
} from '../components/navigation/navigationConfig'
import ItineraryView from './trip/ItineraryView'
import LedgerView from './trip/LedgerView'
import LogisticsView from './trip/LogisticsView'

/**
 * Presents the placeholder detail view for an individual trip.
 *
 * @returns The trip detail page.
 */
function Trip() {
  const navigate = useNavigate()
  const [section, setSection] = useState<TripSection>('itinerary')

  return (
    <section>
      <PageIntro
        eyebrow="Trip details"
        title="Your next adventure"
        description="Build an itinerary, collect reservations, and keep important notes close at hand."
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-[2fr_1fr]">
        {section === 'itinerary' ? <ItineraryView /> : null}
        {section === 'ledger' ? <LedgerView /> : null}
        {section === 'logistics' ? <LogisticsView /> : null}
        <aside className="rounded-3xl bg-surface-container p-8">
          <h2 className="text-xl font-semibold">Trip overview</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Dates, travelers, and key details coming soon.
          </p>
        </aside>
      </div>

      <BottomNav
        aria-label="Trip navigation"
        items={tripNavItems}
        value={section}
        onChange={(value) => setSection(value as TripSection)}
        leadingAction={{
          icon: ArrowLeft,
          label: 'My Trips',
          onClick: () => navigate('/my-trips'),
        }}
      />
    </section>
  )
}

export default Trip
