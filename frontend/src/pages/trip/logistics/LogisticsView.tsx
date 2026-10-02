import { useState } from 'react';
import { useParams } from 'react-router';
import { Text, displayAlert } from '../../../components/common';
import {
  ReservationType,
  useDeleteReservation,
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
 * @returns The Logistics view with live reservation lists and editing.
 */
const LogisticsView = () => {
  const { id: tripId } = useParams<{ id: string }>();
  const [addingType, setAddingType] = useState<ReservationType | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const deleteReservation = useDeleteReservation(tripId ?? '');

  /**
   * Confirms deletion, removes the reservation, and reports API failures.
   * @param reservation - Reservation selected for deletion.
   * @returns A promise that settles after the delete request.
   */
  const handleDelete = async (reservation: Reservation) => {
    if (!window.confirm(`Delete ${reservation.name}?`)) return;
    try {
      await deleteReservation.mutateAsync(reservation);
      displayAlert('Reservation deleted.');
    } catch (error) {
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
        <Text as="h2" id="logistics-heading" variant="display">
          Logistics
        </Text>
      </header>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12">
        <LogisticsChapterNav />

        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
          <FlightsSection
            tripId={tripId}
            onAdd={() => setAddingType(ReservationType.Flights)}
            onEdit={setEditing}
            onDelete={(reservation) => void handleDelete(reservation)}
          />

          <RentalCarsSection
            tripId={tripId}
            onAdd={() => setAddingType(ReservationType.Rentals)}
            onEdit={setEditing}
            onDelete={(reservation) => void handleDelete(reservation)}
          />

          <AccommodationsSection
            tripId={tripId}
            onAdd={() => setAddingType(ReservationType.Accommodations)}
            onEdit={setEditing}
            onDelete={(reservation) => void handleDelete(reservation)}
          />
        </div>
      </div>
      {addingType === ReservationType.Flights ||
      editing?.type === ReservationType.Flights ? (
        <FlightReservationForm
          key={editing?._id ?? 'new'}
          reservation={editing ?? undefined}
          onClose={() => {
            setAddingType(null);
            setEditing(null);
          }}
        />
      ) : null}
      {addingType === ReservationType.Rentals ||
      editing?.type === ReservationType.Rentals ? (
        <RentalCarReservationForm
          key={editing?._id ?? 'new'}
          tripId={tripId}
          reservation={editing ?? undefined}
          onClose={() => {
            setAddingType(null);
            setEditing(null);
          }}
        />
      ) : null}
      {addingType === ReservationType.Accommodations ||
      editing?.type === ReservationType.Accommodations ? (
        <AccommodationReservationForm
          key={editing?._id ?? 'new'}
          tripId={tripId}
          reservation={editing ?? undefined}
          onClose={() => {
            setAddingType(null);
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
};

export default LogisticsView;
