import { describe, expect, it } from 'vitest';
import {
  getTopLevelNavValue,
  tripNavItems,
} from '../../../src/components/navigation/navigationConfig';

describe('getTopLevelNavValue', () => {
  it.each([
    ['/my-trips', '/my-trips'],
    ['/my-trips/archive', '/my-trips'],
    ['/profile', '/profile'],
  ])('maps %s to %s', (pathname, expected) => {
    expect(getTopLevelNavValue(pathname)).toBe(expected);
  });

  it('falls back to My Trips for contextual and unknown pages', () => {
    expect(getTopLevelNavValue('/trip')).toBe('/my-trips');
    expect(getTopLevelNavValue('/search')).toBe('/my-trips');
    expect(getTopLevelNavValue('/unknown')).toBe('/my-trips');
  });
});

describe('trip navigation', () => {
  it('places settings before the itinerary', () => {
    expect(tripNavItems.map((item) => item.value)).toEqual([
      'settings',
      'itinerary',
      'ledger',
      'logistics',
      'album',
    ]);
  });
});
