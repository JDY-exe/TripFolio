import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import BottomNav from '../../components/navigation/BottomNav';
import {
  tripNavItems,
  type TripSection,
} from '../../components/navigation/navigationConfig';
import AlbumView from './album/AlbumView';
import ItineraryView from './itinerary/ItineraryView';
import LedgerView from './ledger/LedgerView';
import LogisticsView from './logistics/LogisticsView';
import TripSettings from './TripSettings';

/**
 * Presents the placeholder detail view for an individual trip.
 * It switches sections locally, giving Logistics and Album the full content width.
 *
 * @returns The trip detail page.
 */
function Trip() {
  const navigate = useNavigate();
  const [section, setSection] = useState<TripSection>('itinerary');

  return (
    <section>
      <div
        className={`mt-10 grid gap-5 ${section === 'settings' ? '' : 'lg:grid-cols-[2fr_1fr]'}`}
      >
        {section === 'itinerary' ? <ItineraryView /> : null}
        {section === 'ledger' ? <LedgerView /> : null}
        {section === 'logistics' ? <LogisticsView /> : null}
        {section === 'album' ? <AlbumView /> : null}
        {section === 'settings' ? <TripSettings /> : null}
      </div>

      <BottomNav
        label="Trip navigation"
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
  );
}

export default Trip;
