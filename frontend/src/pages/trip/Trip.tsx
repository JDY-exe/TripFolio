import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useTripDetails } from '../../queries/trips';
import { Button, Text } from '../../components/common';
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
 * Presents shared trip sections, with archived trips restricted to browsing.
 * It switches sections locally, giving Logistics and Album the full content width.
 * @param props - Whether this is the archived trip route.
 *
 * @returns The trip detail page.
 */
const Trip = ({ archived = false }: { archived?: boolean }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: trip, isPending, isError, refetch } = useTripDetails(id);
  const readOnly =
    archived || trip?.archived === true || trip?.currentUserRole === 'viewer';
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const section: TripSection = tripNavItems.some(
    (item) => item.value === requestedSection,
  )
    ? (requestedSection as TripSection)
    : 'itinerary';

  if (id && isPending) return <Text color="muted">Loading trip...</Text>;
  if (isError)
    return (
      <section role="alert" className="space-y-4">
        <Text color="error">Trip could not be loaded.</Text>
        <Button variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      </section>
    );

  return (
    <section>
      <div
        className={`mt-10 grid gap-5 ${section === 'settings' ? '' : 'lg:grid-cols-[2fr_1fr]'}`}
      >
        {section === 'itinerary' && (
          <ItineraryView
            readOnly={readOnly}
            archived={archived || trip?.archived === true}
          />
        )}
        {section === 'ledger' && <LedgerView />}
        {section === 'logistics' && <LogisticsView readOnly={readOnly} />}
        {section === 'album' && <AlbumView readOnly={readOnly} />}
        {section === 'settings' && <TripSettings readOnly={readOnly} />}
      </div>

      <BottomNav
        label="Trip navigation"
        items={tripNavItems}
        value={section}
        onChange={(value) => setSearchParams({ section: value })}
        leadingAction={{
          icon: ArrowLeft,
          label: archived ? 'Archived Trips' : 'My Trips',
          onClick: () => navigate(archived ? '/archived-trips' : '/my-trips'),
        }}
      />
    </section>
  );
};

export default Trip;
