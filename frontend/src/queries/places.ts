import { useQuery } from '@tanstack/react-query';
import { getFromApi } from '../utils/api';

export interface PlaceSuggestion {
  placePrediction?: {
    placeId: string;
    text: { text: string };
    structuredFormat?: {
      mainText?: { text: string };
      secondaryText?: { text: string };
    };
    types?: string[];
  };
}

/** Searches Google place suggestions for the event location field.
 * @param query - Debounced location text.
 * @param enabled - Whether the location picker is open.
 * @returns Current suggestions and request state.
 */
export const usePlaceSuggestions = (query: string, enabled: boolean) => {
  const { data, isFetching, isError } = useQuery({
    queryKey: ['place-suggestions', query],
    queryFn: () =>
      getFromApi<{ suggestions: PlaceSuggestion[] }>(
        `/destination?query_term=${encodeURIComponent(query)}`,
      ),
    enabled: enabled && query.trim().length >= 2,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  return { suggestions: data?.suggestions ?? [], isFetching, isError };
};
