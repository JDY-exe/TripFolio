import { describe, expect, it } from 'vitest';
import {
  getTopLevelNavValue,
  tripNavItems,
} from '../../../src/components/navigation/navigationConfig';

describe('getTopLevelNavValue', () => {
  it.each([
    ['/search', '/search'],
    ['/search/results', '/search'],
    ['/my-trips', '/my-trips'],
    ['/my-trips/archive', '/my-trips'],
    ['/profile', '/profile'],
  ])('maps %s to %s', (pathname, expected) => {
    expect(getTopLevelNavValue(pathname)).toBe(expected);
  });

  it('falls back to My Trips for contextual and unknown pages', () => {
    expect(getTopLevelNavValue('/trip')).toBe('/my-trips');
    expect(getTopLevelNavValue('/unknown')).toBe('/my-trips');
  });
});

describe('trip navigation', () => {
  it('retains existing sections and includes trip settings', () => {
    expect(tripNavItems.map((item) => item.value)).toEqual([
      'itinerary',
      'ledger',
      'logistics',
      'album',
      'settings',
    ]);
  });
});
