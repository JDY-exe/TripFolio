import { useState } from 'react';
import { useParams } from 'react-router';
import { Button, Modal, Text, displayAlert } from '../../../components/common';
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

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12">
        <LogisticsChapterNav />

        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
          <FlightsSection
            tripId={tripId}
          />

          <AccommodationsSection
            tripId={tripId}
          />

          <RentalCarsSection
            tripId={tripId}

          />
        </div>
      </div>
    </section>
  );
};

export default LogisticsView;
