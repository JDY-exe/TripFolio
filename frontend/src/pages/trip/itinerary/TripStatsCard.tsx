import { forwardRef } from 'react';
import {
  Calendar,
  DollarSign,
  CalendarCheck,
  Utensils,
  Camera,
  Navigation,
  Sparkles,
  Users,
  Flame,
  MapPin,
} from 'lucide-react';

export interface TopCityStat {
  name: string;
  hours: number;
}

export interface TripStatsData {
  tripName: string;
  startDate?: string;
  endDate?: string;
  travelerCount: number;
  durationDays: number;
  totalExpenses: number;
  averageDailySpend: number;
  totalEvents: number;
  culinaryStops: number;
  busiestDay: {
    date: string | null;
    count: number;
  };
  uniqueCitiesCount: number;
  topCities: TopCityStat[];
  totalPhotos: number;
  totalDistanceMiles: number;
}

interface TripStatsCardProps {
  stats: TripStatsData | null;
}

const formatDateRange = (start?: string, end?: string) => {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
};

const formatShortDate = (isoDate: string) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

export const TripStatsCard = forwardRef<HTMLDivElement, TripStatsCardProps>(
  ({ stats }, ref) => {
    const safeStats: TripStatsData = stats ?? {
      tripName: 'Trip Summary',
      travelerCount: 0,
      durationDays: 0,
      totalExpenses: 0,
      averageDailySpend: 0,
      totalEvents: 0,
      culinaryStops: 0,
      busiestDay: { date: null, count: 0 },
      uniqueCitiesCount: 0,
      topCities: [],
      totalPhotos: 0,
      totalDistanceMiles: 0,
    };

    const busiestDayValue =
      safeStats.busiestDay?.count > 0
        ? `${safeStats.busiestDay.count} ${safeStats.busiestDay.count === 1 ? 'Event' : 'Events'}`
        : '0 Events';

    const busiestDaySubtext =
      safeStats.busiestDay?.date && safeStats.busiestDay.count > 0
        ? `on ${formatShortDate(safeStats.busiestDay.date)}`
        : 'No events scheduled';

    return (
      <div
        ref={ref}
        style={{ width: '640px' }}
        className="overflow-hidden rounded-3xl bg-[#0f1f1c] p-8 font-sans text-white shadow-2xl"
      >
        {/* Header Banner */}
        <div className="border-b border-teal-500/30 pb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300">
                <Sparkles size={14} />
                TripFolio Wrapped
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-[#162d29] px-3 py-1 text-xs font-medium text-teal-200">
                <Users size={13} className="text-teal-300" />
                {safeStats.travelerCount}{' '}
                {safeStats.travelerCount === 1 ? 'Traveler' : 'Travelers'}
              </span>
            </div>
            {safeStats.startDate && safeStats.endDate && (
              <span className="text-sm font-medium text-teal-200/70">
                {formatDateRange(safeStats.startDate, safeStats.endDate)}
              </span>
            )}
          </div>
          <h1 className="mt-4 break-words text-4xl font-extrabold tracking-tight text-white">
            {safeStats.tripName}
          </h1>
          <p className="mt-1 text-sm text-teal-200/70">
            Trip Statistics &amp; Highlights Snapshot
          </p>
        </div>

        {/* 8-Metric (2x4) Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {/* 1. Duration */}
          <div className="flex items-center gap-4 rounded-2xl border border-teal-500/20 bg-[#162d29] p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/20 text-teal-300">
              <Calendar size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-teal-200/70">
                Duration
              </p>
              <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-white">
                {safeStats.durationDays}{' '}
                {safeStats.durationDays === 1 ? 'Day' : 'Days'}
              </p>
            </div>
          </div>

          {/* 2. Total Expenses + Average Daily Spend */}
          <div className="flex items-center gap-4 rounded-2xl border border-teal-500/20 bg-[#162d29] p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/20 text-teal-300">
              <DollarSign size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-teal-200/70">
                Total Expenses
              </p>
              <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-white">
                $
                {safeStats.totalExpenses.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium tabular-nums text-teal-300/80">
                $
                {safeStats.averageDailySpend.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                / day avg
              </p>
            </div>
          </div>

          {/* 3. Total Events */}
          <div className="flex items-center gap-4 rounded-2xl border border-teal-500/20 bg-[#162d29] p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/20 text-teal-300">
              <CalendarCheck size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-teal-200/70">
                Total Events
              </p>
              <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-white">
                {safeStats.totalEvents}
              </p>
            </div>
          </div>

          {/* 4. Culinary Stops */}
          <div className="flex items-center gap-4 rounded-2xl border border-teal-500/20 bg-[#162d29] p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/20 text-teal-300">
              <Utensils size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-teal-200/70">
                Culinary Stops
              </p>
              <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-white">
                {safeStats.culinaryStops}
              </p>
            </div>
          </div>

          {/* 5. Distance Covered */}
          <div className="flex items-center gap-4 rounded-2xl border border-teal-500/20 bg-[#162d29] p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/20 text-teal-300">
              <Navigation size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-teal-200/70">
                Distance Covered
              </p>
              <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-white">
                {safeStats.totalDistanceMiles} mi
              </p>
            </div>
          </div>

          {/* 6. Album Photos */}
          <div className="flex items-center gap-4 rounded-2xl border border-teal-500/20 bg-[#162d29] p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/20 text-teal-300">
              <Camera size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-teal-200/70">
                Album Photos
              </p>
              <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-white">
                {safeStats.totalPhotos}
              </p>
            </div>
          </div>

          {/* 7. Busiest Day */}
          <div className="flex items-center gap-4 rounded-2xl border border-teal-500/20 bg-[#162d29] p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/20 text-teal-300">
              <Flame size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-teal-200/70">
                Busiest Day
              </p>
              <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-white">
                {busiestDayValue}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-teal-300/80">
                {busiestDaySubtext}
              </p>
            </div>
          </div>

          {/* 8. Cities Visited + Top 3 Longest Duration */}
          <div className="flex items-center gap-4 rounded-2xl border border-teal-500/20 bg-[#162d29] p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/20 text-teal-300">
              <MapPin size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-teal-200/70">
                Cities Visited
              </p>
              <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-white">
                {safeStats.uniqueCitiesCount}{' '}
                {safeStats.uniqueCitiesCount === 1 ? 'City' : 'Cities'}
              </p>
              {safeStats.topCities.length > 0 ? (
                <p className="mt-0.5 truncate text-xs font-medium text-teal-300/85">
                  {safeStats.topCities
                    .map((city, idx) => `${idx + 1}. ${city.name}`)
                    .join(' · ')}
                </p>
              ) : (
                <p className="mt-0.5 truncate text-xs text-teal-200/50">
                  No locations logged
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-teal-500/20 pt-4 text-xs text-teal-200/50">
          <span>Generated with TripFolio</span>
          <span>#TripFolioStats</span>
        </div>
      </div>
    );
  }
);

TripStatsCard.displayName = 'TripStatsCard';