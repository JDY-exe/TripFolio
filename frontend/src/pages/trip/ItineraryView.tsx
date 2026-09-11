import {
  ArrowRight,
  Badge,
  Footprints,
  MapPin,
  Navigation,
  Pencil,
  Plus,
} from 'lucide-react'

/**
 * Displays a single sample walking event on a static day timeline.
 * An arched date, scalloped activity marker, and asymmetric card borrow MD3's
 * expressive shapes while using the app's semantic colors and native elements.
 *
 * @returns A presentation-only itinerary with inactive event actions.
 */
function ItineraryView() {
  return (
    <section
      aria-labelledby="itinerary-heading"
      className="min-w-0 text-on-surface"
    >
      <header className="flex items-center justify-between gap-4">
        <h2 id="itinerary-heading" className="text-title">
          Itinerary
        </h2>
        <button
          type="button"
          disabled
          aria-label="Add an itinerary event"
          className="grid size-12 shrink-0 place-items-center rounded-[1rem_0.5rem_1rem_0.5rem] bg-primary text-on-primary"
        >
          <Plus aria-hidden size={22} />
        </button>
      </header>

      <div className="mb-7 mt-6 flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-t-full rounded-b-2xl bg-primary-container text-on-primary-container"
        >
          <span className="text-xs font-medium uppercase tracking-wider">
            Apr
          </span>
          <span className="mt-0.5 text-4xl leading-none tracking-tight">
            03
          </span>
        </div>
        <div>
          <h3 className="text-title">
            <time dateTime="2027-04-03">
              Saturday<span className="sr-only">, 3 April 2027</span>
            </time>
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">Kyoto, Japan</p>
        </div>
      </div>

      {/* TODO: Replace this sample event and connect actions when implementing itineraries. */}
      <ol>
        <li className="relative pl-12 sm:pl-16">
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-5 top-11 w-px bg-outline-variant"
          />
          <div
            role="img"
            aria-label="Walking event"
            className="absolute left-0 top-0 grid size-11 place-items-center"
          >
            <Badge
              aria-hidden
              size={44}
              fill="currentColor"
              strokeWidth={0}
              className="absolute inset-0 text-secondary-container"
            />
            <Footprints
              aria-hidden
              size={19}
              className="relative text-on-secondary-container"
            />
          </div>

          <p className="mb-3 flex min-h-11 items-center gap-2 text-label tabular-nums">
            <time dateTime="2027-04-03T09:00:00+09:00">09:00</time>
            <ArrowRight
              aria-hidden
              size={14}
              className="text-on-surface-variant"
            />
            <span className="sr-only">to</span>
            <time
              dateTime="2027-04-03T11:00:00+09:00"
              className="text-on-surface-variant"
            >
              11:00
            </time>
          </p>

          <article className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-[2rem_0.75rem_2rem_0.75rem] bg-surface-container-low p-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-x-4">
            <img
              src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80"
              alt=""
              width={1000}
              height={563}
              loading="lazy"
              className="h-20 w-full rounded-[1.25rem_0.5rem_1.25rem_0.5rem] bg-surface-container object-cover sm:row-span-3 sm:h-full"
            />

            <div className="min-w-0">
              <h4 className="text-base font-medium leading-6">
                Walk through Higashiyama
              </h4>

              <p className="mt-1 flex items-start gap-1.5 text-sm text-on-surface-variant">
                <MapPin aria-hidden size={14} className="mt-0.5 shrink-0" />
                Ninenzaka, Kyoto
              </p>
            </div>
            <p className="col-span-2 text-sm leading-5 text-on-surface-variant sm:col-span-1">
              Side streets to Hokan-ji, then a stop for coffee.
            </p>

            <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-1">
              <button
                type="button"
                disabled
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary-container px-4 py-2 text-label text-on-secondary-container"
              >
                <Navigation aria-hidden size={16} />
                Directions
              </button>
              <button
                type="button"
                disabled
                aria-label="Edit Walk through Higashiyama"
                className="grid size-11 shrink-0 place-items-center rounded-full text-on-surface-variant"
              >
                <Pencil aria-hidden size={18} />
              </button>
            </div>
          </article>
        </li>
      </ol>
    </section>
  )
}

export default ItineraryView
