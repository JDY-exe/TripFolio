/** Lists every calendar day in a trip, including its start and end dates.
 * @param startDate - The trip's first date.
 * @param endDate - The trip's last date.
 * @returns UTC date keys in chronological order.
 */
export const getItineraryDays = (
  startDate: string,
  endDate: string,
): string[] => {
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00Z`);
  const days: string[] = [];

  for (let time = start.getTime(); time <= end.getTime(); time += 86_400_000) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }

  return days;
};
