import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Button, Modal, Text, displayAlert } from '../../../components/common';
import {
  ReservationType,
  useDeleteReservation,
  useReservations,
} from '../../../queries/reservations';
import type { Reservation } from '../../../queries/reservations';
import { getApiErrorMessage } from '../../../utils/api';
import AccommodationReservationForm from './accommodations/AccommodationReservationForm';
import AccommodationsSection from './accommodations/AccommodationsSection';
import FlightReservationForm from './flights/FlightReservationForm';
import FlightsSection from './flights/FlightsSection';
import LogisticsChapterNav from './LogisticsChapterNav';
import RentalCarReservationForm from './rentals/RentalCarReservationForm';
import RentalCarsSection from './rentals/RentalCarsSection';

/**
 * Displays trip reservations by category and manages reservation actions.
 *
 * @param props - Whether reservation mutations should be hidden.
 * @returns The Logistics view with live reservation lists and optional editing.
 */
const LogisticsView = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { id: tripId } = useParams<{ id: string }>();
  const [addingType, setAddingType] = useState<ReservationType | null>(null);
  const [manualEditing, setEditing] = useState<Reservation | null>(null);
  const [params, setParams] = useSearchParams();
  const linkedTripId =
    params.has('reservation') && !readOnly ? tripId : undefined;
  const linkedFlights = useReservations(linkedTripId, ReservationType.Flights);
  const linkedHotels = useReservations(
    linkedTripId,
    ReservationType.Accommodations,
  );
  const linkedRentals = useReservations(linkedTripId, ReservationType.Rentals);
  const linkedQueries = [linkedFlights, linkedHotels, linkedRentals];
  const linkedLoading = linkedQueries.some((query) => query.isPending);
  const linkedError = linkedQueries.some((query) => query.isError);
  const editing =
    manualEditing ||
    linkedQueries
      .flatMap((query) => query.reservations)
      .find((item) => item._id === params.get('reservation')) ||
    null;
  /** Closes reservation editing and removes the optional deep link from the URL. */
  const closeEditing = () => {
    setAddingType(null);
    setEditing(null);
    if (params.has('reservation'))
      setParams({ section: 'logistics' }, { replace: true });
  };
  const [reservationToDelete, setReservationToDelete] =
    useState<Reservation | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const deleteReservation = useDeleteReservation(tripId ?? '');

  /**
   * Removes the confirmed reservation and reports API failures.
   * @returns A promise that settles after the delete request.
   */
  const handleDelete = async () => {
    if (readOnly || !reservationToDelete) return;
    try {
      await deleteReservation.mutateAsync(reservationToDelete);
      setDeleteModalOpen(false);
      displayAlert('Reservation deleted.');
    } catch (error) {
      setDeleteModalOpen(false);
      displayAlert({
        message: getApiErrorMessage(error, 'Could not delete the reservation.'),
        tone: 'error',
      });
    }
  };

  if (!tripId) return <Text>Trip not found.</Text>;

  return (
    <section
      aria-labelledby="logistics-heading"
      className="min-w-0 text-on-surface lg:col-span-2"
    >
      <header>
        <Text
          as="h2"
          data-cy="trip-section-logistics"
          id="logistics-heading"
          variant="display"
        >
          Logistics
        </Text>
      </header>

      {params.has('reservation') && !readOnly && linkedLoading && (
        <Text role="status">Loading reservation…</Text>
      )}
      {params.has('reservation') && linkedError && (
        <>
          <Text role="alert" color="error">
            Could not load the linked reservation.
          </Text>
          <Button
            variant="outline"
            onClick={() =>
              void Promise.all(linkedQueries.map((query) => query.refetch()))
            }
          >
            Retry
          </Button>
        </>
      )}
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12">
        <LogisticsChapterNav />

        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
          <FlightsSection
            readOnly={readOnly}
            tripId={tripId}
            onAdd={() => setAddingType(ReservationType.Flights)}
            onEdit={setEditing}
            onDelete={(reservation) => {
              setReservationToDelete(reservation);
              setDeleteModalOpen(true);
            }}
          />

          <AccommodationsSection
            readOnly={readOnly}
            tripId={tripId}
            onAdd={() => setAddingType(ReservationType.Accommodations)}
            onEdit={setEditing}
            onDelete={(reservation) => {
              setReservationToDelete(reservation);
              setDeleteModalOpen(true);
            }}
          />

          <RentalCarsSection
            readOnly={readOnly}
            tripId={tripId}
            onAdd={() => setAddingType(ReservationType.Rentals)}
            onEdit={setEditing}
            onDelete={(reservation) => {
              setReservationToDelete(reservation);
              setDeleteModalOpen(true);
            }}
          />
        </div>
      </div>
      {!readOnly && reservationToDelete && (
        <Modal
          data-cy="delete-reservation-dialog"
          open={deleteModalOpen}
          title={`Delete ${reservationToDelete.name}?`}
          onClose={() => {
            if (!deleteReservation.isPending) setReservationToDelete(null);
          }}
          onExited={() => setReservationToDelete(null)}
          dismissDisabled={deleteReservation.isPending}
          footer={(requestClose) => (
            <>
              <Button
                data-cy="delete-reservation-cancel"
                variant="secondary"
                disabled={deleteReservation.isPending}
                onClick={requestClose}
              >
                Cancel
              </Button>
              <Button
                data-cy="delete-reservation-confirm"
                variant="danger"
                disabled={deleteReservation.isPending}
                onClick={() => void handleDelete()}
              >
                {deleteReservation.isPending
                  ? 'Deleting...'
                  : 'Delete reservation'}
              </Button>
            </>
          )}
        >
          <Text>
            This reservation and all its linked itinerary entries will be
            removed from your trip.
          </Text>
        </Modal>
      )}
      {!readOnly &&
        (addingType === ReservationType.Flights ||
          editing?.type === ReservationType.Flights) && (
          <FlightReservationForm
            key={editing?._id ?? 'new'}
            tripId={tripId}
            reservation={editing ?? undefined}
            onClose={closeEditing}
          />
        )}
      {!readOnly &&
        (addingType === ReservationType.Rentals ||
          editing?.type === ReservationType.Rentals) && (
          <RentalCarReservationForm
            key={editing?._id ?? 'new'}
            tripId={tripId}
            reservation={editing ?? undefined}
            onClose={closeEditing}
          />
        )}
      {!readOnly &&
        (addingType === ReservationType.Accommodations ||
          editing?.type === ReservationType.Accommodations) && (
          <AccommodationReservationForm
            key={editing?._id ?? 'new'}
            tripId={tripId}
            reservation={editing ?? undefined}
            onClose={closeEditing}
          />
        )}
    </section>
  );
};

export default LogisticsView;
