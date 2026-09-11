import { Plus } from 'lucide-react'
import { mockTrips } from './mockTrips'
import TripCard from './TripCard'

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
        <h1 className="text-headline tracking-tight">My upcoming trips</h1>
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-label text-on-primary"
        >
          <Plus aria-hidden size={18} />
          New trip
        </button>
      </header>

      {/* TODO: Replace the static controls and sample content when implementing trips. */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {mockTrips.map((trip) => (
          <TripCard key={trip.title} {...trip} />
        ))}
      </div>
    </section>
  )
}

export default MyTrips
