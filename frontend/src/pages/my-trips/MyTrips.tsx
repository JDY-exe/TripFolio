import { Plus } from 'lucide-react';
import { Button, Text } from '../../components/common';
import { mockTrips } from './mockTrips';
import TripCard from './TripCard';

/**
 * Presents a static trip-collection mockup using sample cards and native controls.
 * Controls are disabled deliberately; no application state or data wiring is added.
 *
 * @returns The presentation-only My Trips page.
 */
function MyTrips() {
  return (
    <section className="text-on-surface">
      <header className="flex items-center justify-between gap-4">
        <Text as="h1" variant="headline">
          My upcoming trips
        </Text>
        <Button
          disabled
          leadingIcon={<Plus aria-hidden size={18} />}
          className="shrink-0"
        >
          New trip
        </Button>
      </header>

      {/* TODO: Replace the static controls and sample content when implementing trips. */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {mockTrips.map((trip) => (
          <TripCard key={trip.title} {...trip} />
        ))}
      </div>
    </section>
  );
}

export default MyTrips;
