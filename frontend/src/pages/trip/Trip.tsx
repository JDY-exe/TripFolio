import TripEditingProvider from './editing/TripEditingProvider';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
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
 * Presents the detail view for an individual trip.
 * It switches sections locally, giving Logistics and Album the full content width.
 *
 * @returns The trip detail page.
 */
const Trip = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [section, setSection] = useState<TripSection>('itinerary');

  return (
    <TripEditingProvider key={id}>
      <section>
        <div
          className={`mt-10 grid gap-5 ${section === 'settings' ? '' : 'lg:grid-cols-[2fr_1fr]'}`}
        >
          {section === 'itinerary' && <ItineraryView />}
          {section === 'ledger' && <LedgerView />}
          {section === 'logistics' && <LogisticsView />}
          {section === 'album' && <AlbumView />}
          {section === 'settings' && <TripSettings />}
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
    </TripEditingProvider>
  );
};

export default Trip;
