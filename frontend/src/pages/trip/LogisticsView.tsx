import {
  Badge,
  BedDouble,
  CarFront,
  Luggage,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Settings2,
  UsersRound,
} from 'lucide-react'
import { IconButton, Text } from '../../components/common'
import LogisticsChapterNav from './LogisticsChapterNav'

/**
 * Displays sample flight, car-rental, and accommodation reservations.
 * Distinct ticket, arch, and scalloped shapes organize static travel details;
 * a native chapter outline provides navigation without application state.
 *
 * @returns The Logistics mockup with inactive reservation actions.
 */
function LogisticsView() {
  return (
    <section
      aria-labelledby="logistics-heading"
      className="min-w-0 text-on-surface lg:col-span-2"
    >
      <header className="flex items-center justify-between gap-4">
        <Text as="h2" id="logistics-heading" variant="title">
          Logistics
        </Text>
        <IconButton
          disabled
          aria-label="Add a reservation"
          variant="primary"
          size="lg"
          icon={<Plus aria-hidden size={22} />}
          className="rounded-[1rem_0.5rem_1rem_0.5rem]"
        />
      </header>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12">
        <LogisticsChapterNav />

        {/* TODO: Replace sample reservations and connect editing when implementing logistics. */}
        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
          <section
            id="logistics-flights"
            aria-labelledby="flights-heading"
            tabIndex={-1}
            className="scroll-mt-8 rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <h3 id="flights-heading" className="mb-4 text-base font-medium">
              Flights
            </h3>
            <article className="overflow-hidden rounded-[1.75rem_0.75rem_1.75rem_0.75rem] bg-surface-container-low">
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-[1rem_0.5rem_1rem_0.5rem] bg-primary-container text-on-primary-container">
                    <Plane aria-hidden size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-medium">
                      Singapore Airlines
                    </h4>
                    <p className="mt-0.5 text-sm text-on-surface-variant">
                      SQ 618 / Economy
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
                  <div>
                    <p className="text-3xl tracking-tight">SIN</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Singapore
                    </p>
                    <time
                      dateTime="2027-04-02T08:25:00+08:00"
                      className="mt-3 block text-lg font-medium tabular-nums"
                    >
                      08:25
                    </time>
                  </div>
                  <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                    <div aria-hidden="true" className="flex items-center gap-2">
                      <span className="hidden w-8 border-t border-dashed border-outline-variant sm:block" />
                      <Plane size={18} className="rotate-45 text-primary" />
                      <span className="hidden w-8 border-t border-dashed border-outline-variant sm:block" />
                    </div>
                    <span className="text-xs">Nonstop</span>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl tracking-tight">KIX</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Osaka Kansai
                    </p>
                    <time
                      dateTime="2027-04-02T16:10:00+09:00"
                      className="mt-3 block text-lg font-medium tabular-nums"
                    >
                      16:10
                    </time>
                  </div>
                </div>
                <p className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
                  <time dateTime="2027-04-02">2 Apr 2027</time>
                  <span>Local airport times</span>
                </p>
              </div>

              <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-outline-variant px-5 py-2 before:absolute before:-left-2 before:-top-2 before:size-4 before:rounded-full before:bg-surface after:absolute after:-right-2 after:-top-2 after:size-4 after:rounded-full after:bg-surface sm:px-6">
                <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Luggage aria-hidden size={16} />
                  23 kg checked bag
                </p>
                <IconButton
                  disabled
                  aria-label="Edit flight reservation"
                  icon={<Pencil aria-hidden size={18} />}
                />
              </div>
            </article>
          </section>

          <section
            id="logistics-cars"
            aria-labelledby="cars-heading"
            tabIndex={-1}
            className="scroll-mt-8 rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <h3 id="cars-heading" className="mb-4 text-base font-medium">
              Rental cars
            </h3>
            <article className="rounded-[0.75rem_2rem_0.75rem_2rem] bg-surface-container-low p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="grid h-20 w-16 shrink-0 place-items-center rounded-t-full rounded-b-2xl bg-primary-container text-on-primary-container">
                  <CarFront aria-hidden size={28} />
                </div>
                <div>
                  <h4 className="text-base font-medium">Toyota Yaris</h4>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Toyota Rent a Car
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-on-surface-variant">
                    Pick-up
                  </dt>
                  <dd className="mt-1 text-sm">
                    Kyoto Station
                    <time
                      dateTime="2027-04-10T09:00:00+09:00"
                      className="mt-1 block text-on-surface-variant"
                    >
                      10 Apr, 09:00
                    </time>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-on-surface-variant">
                    Return
                  </dt>
                  <dd className="mt-1 text-sm">
                    Kansai Airport
                    <time
                      dateTime="2027-04-12T17:00:00+09:00"
                      className="mt-1 block text-on-surface-variant"
                    >
                      12 Apr, 17:00
                    </time>
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant pt-2">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <Settings2 aria-hidden size={16} />
                    Automatic
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UsersRound aria-hidden size={16} />5 seats
                  </span>
                </div>
                <IconButton
                  disabled
                  aria-label="Edit rental car reservation"
                  icon={<Pencil aria-hidden size={18} />}
                />
              </div>
            </article>
          </section>

          <section
            id="logistics-stays"
            aria-labelledby="stays-heading"
            tabIndex={-1}
            className="scroll-mt-8 rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <h3 id="stays-heading" className="mb-4 text-base font-medium">
              Accommodations
            </h3>
            <article className="rounded-[2rem_0.75rem_2rem_0.75rem] bg-surface-container-low p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div
                  aria-hidden="true"
                  className="relative grid size-16 shrink-0 place-items-center"
                >
                  <Badge
                    size={64}
                    fill="currentColor"
                    strokeWidth={0}
                    className="absolute inset-0 text-secondary-container"
                  />
                  <BedDouble
                    size={26}
                    className="relative text-on-secondary-container"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-medium">Higashiyama House</h4>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-on-surface-variant">
                    <MapPin aria-hidden size={14} className="mt-0.5 shrink-0" />
                    Higashiyama, Kyoto
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 rounded-panel bg-surface-container p-4">
                <div>
                  <dt className="text-xs font-medium text-on-surface-variant">
                    Check-in
                  </dt>
                  <dd className="mt-2">
                    <time dateTime="2027-04-02T18:00:00+09:00">
                      <span className="block text-lg tabular-nums">2 Apr</span>
                      <span className="mt-0.5 block text-sm text-on-surface-variant">
                        18:00
                      </span>
                    </time>
                  </dd>
                </div>
                <div className="border-l border-outline-variant pl-4">
                  <dt className="text-xs font-medium text-on-surface-variant">
                    Check-out
                  </dt>
                  <dd className="mt-2">
                    <time dateTime="2027-04-12T11:00:00+09:00">
                      <span className="block text-lg tabular-nums">12 Apr</span>
                      <span className="mt-0.5 block text-sm text-on-surface-variant">
                        By 11:00
                      </span>
                    </time>
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <UsersRound aria-hidden size={16} />
                  Twin room / 2 guests
                </p>
                <IconButton
                  disabled
                  aria-label="Edit accommodation reservation"
                  icon={<Pencil aria-hidden size={18} />}
                />
              </div>
            </article>
          </section>
        </div>
      </div>
    </section>
  )
}

export default LogisticsView
