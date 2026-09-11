import {
  CalendarDays,
  CircleDollarSign,
  Luggage,
  Search,
  Truck,
  UserRound,
} from 'lucide-react'
import type { BottomNavItem } from './BottomNav'

/** Sections displayed within a selected trip without changing the route. */
export type TripSection = 'itinerary' | 'ledger' | 'logistics'

/** Top-level application destinations displayed in the default bottom nav. */
export const topLevelNavItems = [
  { value: '/search', label: 'Search', icon: Search },
  { value: '/my-trips', label: 'My Trips', icon: Luggage },
  { value: '/profile', label: 'Profile', icon: UserRound },
] as const satisfies readonly BottomNavItem[]

/** Locally controlled views displayed while an individual trip is selected. */
export const tripNavItems = [
  { value: 'itinerary', label: 'Itinerary', icon: CalendarDays },
  { value: 'ledger', label: 'Ledger', icon: CircleDollarSign },
  { value: 'logistics', label: 'Logistics', icon: Truck },
] as const satisfies readonly BottomNavItem[]

/**
 * Resolves the selected top-level navigation value for the current URL.
 *
 * It matches known destination prefixes and falls back to My Trips when a URL
 * does not correspond to a top-level item, such as the selected-trip route.
 *
 * @param pathname - Current browser location pathname.
 * @returns The value of the matching top-level navigation item.
 */
export function getTopLevelNavValue(pathname: string): string {
  return (
    topLevelNavItems.find(
      (item) =>
        pathname === item.value || pathname.startsWith(`${item.value}/`),
    )?.value ?? '/my-trips'
  )
}
