import {
  hotelReservation,
  reservationEvent,
  updatedHotelName,
} from '../fixtures/reservation-events';
import { visitOwnedTrip } from '../support/ownedTrip';

describe('reservation-linked itinerary cache', () => {
  it('refreshes recently cached events immediately after creating, editing and deleting a booking', () => {
    let reservations: object[] = [];
    let events: object[] = [];
    cy.intercept(
      { method: 'POST', pathname: '/logistics/hotels' },
      (request) => {
        const reservation = { ...hotelReservation, ...request.body };
        reservations = [reservation];
        events = [{ ...reservationEvent, title: reservation.name }];
        request.reply({
          statusCode: 201,
          body: { reservation, event: events[0] },
        });
      },
    );
    cy.intercept(
      {
        method: 'PATCH',
        pathname: `/logistics/hotels/${hotelReservation._id}`,
      },
      (request) => {
        const reservation = { ...hotelReservation, ...request.body };
        reservations = [reservation];
        events = [{ ...reservationEvent, title: reservation.name }];
        request.reply({ body: { reservation } });
      },
    );
    cy.intercept(
      {
        method: 'DELETE',
        pathname: `/logistics/hotels/${hotelReservation._id}`,
      },
      (request) => {
        reservations = [];
        events = [];
        request.reply({ body: { message: 'Reservation deleted' } });
      },
    );
    visitOwnedTrip(undefined, {
      events: () => events,
      reservations: (path) =>
        path === '/logistics/hotels' ? reservations : [],
    });
    cy.get('[data-cy="trip-section-itinerary"]').should('be.visible');
    cy.get(`[data-cy="event-card-${reservationEvent._id}"]`).should(
      'not.exist',
    );
    cy.get('[data-cy="nav-logistics"]').click();
    cy.get('[data-cy="add-accommodation"]').click();
    cy.get('[data-cy="accommodation-name"]').type(hotelReservation.name);
    cy.get('[data-cy="accommodation-address"]').type(
      hotelReservation.accommodations.address,
    );
    cy.get('[data-cy="accommodation-check-in"]').type(
      hotelReservation.startTime.slice(0, 10),
    );
    cy.get('[data-cy="accommodation-check-out"]').type(
      hotelReservation.endTime.slice(0, 10),
    );
    cy.get('[data-cy="accommodation-next"]').click();
    cy.get('[data-cy="accommodation-save"]').click();
    cy.get(`[data-cy="reservation-card-${hotelReservation._id}"]`).should(
      'exist',
    );
    cy.get('[data-cy="nav-itinerary"]').click();
    cy.get(`[data-cy="event-card-${reservationEvent._id}"]`).should(
      'contain',
      hotelReservation.name,
    );

    cy.get('[data-cy="nav-logistics"]').click();
    cy.get(`[data-cy="edit-reservation-${hotelReservation._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="accommodation-name"]').clear().type(updatedHotelName);
    cy.get('[data-cy="accommodation-next"]').click();
    cy.get('[data-cy="accommodation-save"]').click();
    cy.get(`[data-cy="reservation-card-${hotelReservation._id}"]`).should(
      'contain',
      updatedHotelName,
    );
    cy.get('[data-cy="nav-itinerary"]').click();
    cy.get(`[data-cy="event-card-${reservationEvent._id}"]`).should(
      'contain',
      updatedHotelName,
    );

    cy.get('[data-cy="nav-logistics"]').click();
    cy.get(`[data-cy="delete-reservation-${hotelReservation._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="delete-reservation-confirm"]').click();
    cy.get(`[data-cy="reservation-card-${hotelReservation._id}"]`).should(
      'not.exist',
    );
    cy.get('[data-cy="nav-itinerary"]').click();
    cy.get('[data-cy="trip-section-itinerary"]').should('be.visible');
    cy.get(`[data-cy="event-card-${reservationEvent._id}"]`).should(
      'not.exist',
    );
  });
});
