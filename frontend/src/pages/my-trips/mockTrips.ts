import type { TripCardProps } from './TripCard';

/** Presentation-only sample content, not a trip API or persisted data model. */
export const mockTrips = [
  {
    title: 'Kyoto in bloom',
    destination: 'Kyoto, Japan',
    dates: 'Apr 3 - 12, 2027',
    travelers: '2 travelers',
    status: 'Upcoming',
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80',
  },
  {
    title: 'A slow week in Lisbon',
    destination: 'Lisbon, Portugal',
    dates: 'May 16 - 23, 2027',
    travelers: '4 travelers',
    status: 'Upcoming',
    image:
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1000&q=80',
  },
  {
    title: 'A Copenhagen weekend',
    destination: 'Copenhagen, Denmark',
    dates: 'Aug 21 - 24, 2026',
    travelers: '2 travelers',
    status: 'Past trip',
    image:
      'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1000&q=80',
  },
  {
    title: 'Somewhere in the Alps',
    destination: 'The Alps, Europe',
    dates: 'Dates to be decided',
    travelers: 'Solo trip',
    status: 'Travel idea',
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
  },
] satisfies TripCardProps[];
