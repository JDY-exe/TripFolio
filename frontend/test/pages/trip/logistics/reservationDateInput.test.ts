import { describe, expect, it } from 'vitest';
import {
  reservationDateForDisplay,
  reservationDateToTimestamp,
  toReservationDateInput,
} from '../../../../src/pages/trip/logistics/reservationDateInput';

describe('reservation calendar dates', () => {
  it('preserves the selected calendar day when storing and reopening it', () => {
    const timestamp = reservationDateToTimestamp('2030-04-01');
    expect(timestamp).toBe('2030-04-01T00:00:00.000Z');
    expect(toReservationDateInput(timestamp)).toBe('2030-04-01');
    expect(reservationDateForDisplay(timestamp).toISOString()).toBe(timestamp);
  });

  it('returns an empty input for missing or invalid timestamps', () => {
    expect(toReservationDateInput()).toBe('');
    expect(toReservationDateInput('not-a-date')).toBe('');
  });
});
