import type { EventType } from '../../../queries/events';
export const eventTypeLabels: Record<EventType, string> = {
  activity: 'Activity',
  restaurant: 'Restaurant',
  hotel_checkin: 'Hotel check-in',
  hotel_checkout: 'Hotel check-out',
  rentalcar_pickup: 'Rental car pickup',
  rentalcar_return: 'Rental car return',
  flight: 'Flight',
};
