/**
 * Converts a stored timestamp to the browser's local date-time input value.
 * @param value - ISO timestamp from a reservation, if present.
 * @returns A date and time suitable for datetime-local inputs.
 */
export const toLocalDateTimeInput = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

/**
 * Converts a stored reservation timestamp into a calendar date for date inputs.
 * Midnight UTC identifies new date-only records; older timed reservations keep
 * the date they showed in the browser's local time zone.
 * @param value - Stored ISO timestamp, if present.
 * @returns A YYYY-MM-DD date for a native date input.
 */
export const toReservationDateInput = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const isDateOnly =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;
  return isDateOnly
    ? date.toISOString().slice(0, 10)
    : toLocalDateTimeInput(value).slice(0, 10);
};

/**
 * Stores a calendar date at UTC midnight for the existing Date-based API.
 * @param value - YYYY-MM-DD from a native date input.
 * @returns An ISO timestamp whose UTC date matches the selected date.
 */
export const reservationDateToTimestamp = (value: string): string =>
  `${value}T00:00:00.000Z`;

/**
 * Returns a UTC-midnight Date for displaying a reservation's calendar day.
 * @param value - Stored reservation timestamp.
 * @returns A Date whose UTC day matches the date input shown for this record.
 */
export const reservationDateForDisplay = (value: string): Date =>
  new Date(reservationDateToTimestamp(toReservationDateInput(value)));
