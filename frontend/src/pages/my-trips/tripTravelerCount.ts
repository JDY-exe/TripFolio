import type { Trip } from '../../queries/trips';

/**
 * Counts unique trip members, including an explicit owner not listed in `users`.
 * Traveler profiles are used only when membership IDs are unavailable.
 *
 * @param trip - Trip membership fields returned by the trip API.
 * @returns The number of unique travelers on the trip.
 */
export const getTripTravelerCount = (
  trip: Pick<Trip, 'ownerId' | 'users' | 'travelers'>,
): number => {
  const memberIds = new Set(trip.users ?? []);
  if (trip.ownerId) memberIds.add(trip.ownerId);

  return memberIds.size || trip.travelers?.length || 0;
};
