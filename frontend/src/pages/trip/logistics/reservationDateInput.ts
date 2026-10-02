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
