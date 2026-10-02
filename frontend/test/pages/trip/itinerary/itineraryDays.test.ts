import { describe, expect, it } from 'vitest';
import { getItineraryDays } from '../../../../src/pages/trip/itinerary/itineraryDays';

describe('getItineraryDays', () => {
  it('includes both ends of a trip across a month boundary', () => {
    expect(
      getItineraryDays('2026-10-30T00:00:00.000Z', '2026-11-02T00:00:00.000Z'),
    ).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('returns one day for a same-day trip', () => {
    expect(getItineraryDays('2026-10-02', '2026-10-02')).toEqual([
      '2026-10-02',
    ]);
  });
});
