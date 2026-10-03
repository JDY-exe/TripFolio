import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { Text, displayAlert } from '../../components/common';
import { getApiErrorMessage, getFromApi, patchToApi } from '../../utils/api';

type TripRole = 'owner' | 'editor' | 'viewer' | null;

interface TripSettingsData {
  _id: string;
  isPublic: boolean;
  currentUserRole: TripRole;
}

/**
 * Loads visibility and the current user's role, then sends owner changes through
 * the API while keeping the switch disabled for collaborators without control.
 *
 * @returns The trip visibility setting and its loading or failure state.
 */
const TripSettings = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['trip-settings', id] as const;
  const tripQuery = useQuery({
    queryKey,
    queryFn: () => getFromApi<TripSettingsData>(`/trip/${id}`),
    enabled: Boolean(id),
  });
  const visibilityMutation = useMutation({
    mutationFn: (isPublic: boolean) =>
      patchToApi<TripSettingsData>(`/trip/${id}/visibility`, { isPublic }),
    onSuccess: (trip) => {
      queryClient.setQueryData(queryKey, trip);
      displayAlert({
        message: `Trip is now ${trip.isPublic ? 'public' : 'private'}.`,
        tone: 'success',
      });
    },
    onError: (error) => {
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Trip visibility could not be updated.',
        ),
        tone: 'error',
      });
    },
  });

  if (!id) {
    return <Text color="error">Trip not found.</Text>;
  }
  if (tripQuery.isPending) {
    return <Text color="muted">Loading trip settings...</Text>;
  }
  if (tripQuery.isError || !tripQuery.data) {
    return <Text color="error">Trip settings could not be loaded.</Text>;
  }

  const trip = tripQuery.data;
  const canChangeVisibility = trip.currentUserRole === 'owner';

  return (
    <section aria-labelledby="trip-settings-heading" className="min-w-0">
      <header className="mb-6">
        <Text as="h2" id="trip-settings-heading" variant="title">
          Trip settings
        </Text>
      </header>
      <label className="flex max-w-2xl items-center justify-between gap-5 rounded-panel border border-outline-variant bg-surface-container-low p-5">
        <span>
          <Text as="span" variant="label">
            Public trip
          </Text>
          <Text color="muted" className="mt-1">
            {trip.isPublic
              ? 'Visible to any signed-in TripFolio user.'
              : 'Visible to trip members only.'}
          </Text>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Public trip"
          checked={trip.isPublic}
          disabled={!canChangeVisibility || visibilityMutation.isPending}
          onChange={(event) => visibilityMutation.mutate(event.target.checked)}
          className="size-5 shrink-0 accent-primary"
        />
      </label>
      {!canChangeVisibility ? (
        <Text color="muted" className="mt-3">
          Only the trip owner can change visibility.
        </Text>
      ) : null}
    </section>
  );
};

export default TripSettings;
