import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import BottomNav from '../../components/navigation/BottomNav'
import {
  tripNavItems,
  type TripSection,
} from '../../components/navigation/navigationConfig'
import AlbumView from './AlbumView'
import ItineraryView from './ItineraryView'
import LedgerView from './LedgerView'
import LogisticsView from './LogisticsView'

/**
 * Presents the placeholder detail view for an individual trip.
 * It switches sections locally, giving Logistics and Album the full content width.
 *
 * @returns The trip detail page.
 */
function Trip() {
  const navigate = useNavigate()
  const [section, setSection] = useState<TripSection>('itinerary')

  return (
    <section>
      <div className="mt-10 grid gap-5 lg:grid-cols-[2fr_1fr]">
        {section === 'itinerary' ? <ItineraryView /> : null}
        {section === 'ledger' ? <LedgerView /> : null}
        {section === 'logistics' ? <LogisticsView /> : null}
        {section === 'album' ? <AlbumView /> : null}
        {section === 'itinerary' || section === 'ledger' ? (
          <aside className="rounded-panel bg-surface-container p-8 text-on-surface">
            <h2 className="text-title">Trip overview</h2>
            <p className="mt-2 text-body text-on-surface-variant">
              Dates, travelers, and key details coming soon.
            </p>
          </aside>
        ) : null}
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
