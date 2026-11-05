import {
  hotelReservation,
  checkoutEvent,
  actionInput,
  bookingInput,
  hotelPrediction,
  reservationEvent,
  updatedHotelName,
} from '../fixtures/reservation-events';
import { visitOwnedTrip } from '../support/ownedTrip';

/** Moves a hotel draft through Details and optional Booking to itinerary scheduling. */
const advanceToItinerary = () => {
  cy.get('[data-cy="accommodation-next"]').click();
  cy.get('[data-cy="accommodation-next"]').click();
};

describe('reservation-linked itinerary cache', () => {
  it('selects a hotel place and schedules both boundary actions in the same workflow', () => {
    cy.intercept(
      { method: 'GET', pathname: '/destination' },
      { body: { suggestions: [hotelPrediction] } },
    );
    cy.intercept(
      { method: 'POST', pathname: '/logistics/hotels' },
      (request) => {
        expect(request.body.accommodations.placeId).to.equal(
          hotelPrediction.placePrediction.placeId,
        );
        expect(
          request.body.itineraryActions.map(
            (action: { eventType: string }) => action.eventType,
          ),
        ).to.deep.equal(['hotel_checkin', 'hotel_checkout']);
        request.reply({
          statusCode: 201,
          body: { reservation: { ...hotelReservation, ...request.body } },
        });
      },
    ).as('savePlacedHotel');
    visitOwnedTrip('Logistics');
    cy.get('[data-cy="add-accommodation"]').click();
    cy.get('[data-cy="accommodation-address"]').type(hotelReservation.name);
    cy.get(
      `[data-cy="place-option-${hotelPrediction.placePrediction.placeId}"]`,
    ).click();
    cy.get('[data-cy="accommodation-name"]').should(
      'have.value',
      hotelReservation.name,
    );
    cy.get('[data-cy="accommodation-check-in"]').type(
      hotelReservation.startTime.slice(0, 10),
    );
    cy.get('[data-cy="accommodation-check-out"]').type(
      hotelReservation.endTime.slice(0, 10),
    );
    cy.get('[data-cy="hotel_checkin-start"]').should('not.exist');
    cy.get('[data-cy="accommodation-form"]').screenshot(
      'logistics-details-step',
    );
    cy.get('[data-cy="accommodation-next"]').click();
    cy.get('[data-cy="accommodation-cost"]').type(bookingInput.cost);
    cy.get('[data-cy="accommodation-confirmation"]').type(
      bookingInput.confirmationNumber,
    );
    cy.get('[data-cy="accommodation-notes"]').type(bookingInput.notes);
    cy.get('[data-cy="accommodation-form"]').screenshot(
      'logistics-booking-step-desktop',
    );
    cy.viewport(390, 844);
    cy.get('[data-cy="accommodation-form"]').screenshot(
      'logistics-booking-step-mobile',
    );
    cy.viewport(1000, 660);
    cy.get('[data-cy="accommodation-next"]').click();
    cy.get('[data-cy="hotel_checkin-start"]').type(actionInput.checkin);
    cy.get('[data-cy="hotel_checkout-start"]').type(actionInput.checkout);
    cy.get('[data-cy="accommodation-form"]').screenshot(
      'logistics-actions-desktop',
    );
    cy.viewport(390, 844);
    cy.get('[data-cy="hotel_checkout-start"]').scrollIntoView();
    cy.get('[data-cy="accommodation-form"]').screenshot(
      'logistics-actions-mobile',
    );
    cy.get('[data-cy="accommodation-save"]').click();
    cy.wait('@savePlacedHotel');
  });
  it('inserts a typed action from an existing booking and prevents duplicate insertion', () => {
    let events: object[] = [];
    cy.intercept({ method: 'POST', pathname: '/event' }, (request) => {
      expect(request.body.eventType).to.equal(reservationEvent.eventType);
      expect(request.body.reservation).to.equal(hotelReservation._id);
      events = [{ ...reservationEvent, ...request.body }];
      request.reply({ statusCode: 201, body: events[0] });
    }).as('insertAction');
    visitOwnedTrip(undefined, {
      events: () => events,
      reservations: (path) =>
        path === '/logistics/hotels' ? [hotelReservation] : [],
    });
    cy.get(
      `[data-cy="add-event-${hotelReservation.startTime.slice(0, 10)}"]`,
    ).click();
    cy.get('[data-cy="event-type"]').select('hotel_checkin');
    cy.get('[data-cy="event-reservation"]').select(hotelReservation._id);
    cy.get('[data-cy="event-save"]').click();
    cy.get('[role="alert"]').should('contain.text', 'both event times');
    cy.get('[data-cy="event-start"]').type(actionInput.checkin);
    cy.get('[data-cy="event-save"]').click();
    cy.wait('@insertAction');
    cy.get(
      `[data-cy="event-card-${reservationEvent._id}"] [data-cy="event-type-badge"]`,
    ).should('contain.text', 'Hotel check-in');
    cy.get(
      `[data-cy="add-event-${hotelReservation.startTime.slice(0, 10)}"]`,
    ).click();
    cy.get('[data-cy="event-type"]').select('hotel_checkin');
    cy.get('[data-cy="event-reservation"]').select(hotelReservation._id);
    cy.contains('This action is already on the itinerary.').should(
      'be.visible',
    );
    cy.contains('button', 'View existing entry').click();
    cy.get('[data-cy="event-save"]').should('not.exist');
  });

  it('opens a linked reservation and preserves its existing action times', () => {
    cy.intercept(
      {
        method: 'PATCH',
        pathname: `/logistics/hotels/${hotelReservation._id}`,
      },
      (request) => {
        expect(request.body.changes).not.to.have.property('itineraryActions');
        request.reply({
          body: {
            reservation: {
              ...hotelReservation,
              ...request.body.changes,
              version: 1,
            },
          },
        });
      },
    ).as('saveLinkedReservation');
    visitOwnedTrip(undefined, {
      events: () => [reservationEvent, checkoutEvent],
      reservations: (path) =>
        path === '/logistics/hotels' ? [hotelReservation] : [],
    });
    cy.get(
      `[data-cy="event-card-${reservationEvent._id}"] [data-cy="view-event-reservation"]`,
    ).click();
    cy.get('[data-cy="accommodation-form"]').should('be.visible');
    advanceToItinerary();
    cy.get('[data-cy="action-hotel_checkin"]').should('be.checked');
    cy.get('[data-cy="action-hotel_checkout"]').should('be.checked');
    cy.get('[data-cy="hotel_checkin-start"]').should(
      'have.value',
      actionInput.checkin,
    );
    cy.get('[data-cy="hotel_checkout-start"]').should(
      'have.value',
      actionInput.checkout,
    );
    cy.get('[data-cy="accommodation-save"]').click();
    cy.wait('@saveLinkedReservation');
  });

  it('does not restore a removed action from a stale reservation-event cache', () => {
    let events: object[] = [reservationEvent, checkoutEvent];
    visitOwnedTrip(undefined, {
      events: () => events,
      reservations: (path) =>
        path === '/logistics/hotels' ? [hotelReservation] : [],
    });
    cy.intercept(
      {
        method: 'GET',
        pathname: `/logistics/hotels/${hotelReservation._id}/events`,
      },
      (request) => request.reply({ delay: 200, body: { events } }),
    );
    cy.intercept(
      { method: 'DELETE', pathname: `/event/${reservationEvent._id}` },
      (request) => {
        events = [checkoutEvent];
        request.reply({ body: { message: 'Event deleted' } });
      },
    );
    cy.intercept(
      {
        method: 'PATCH',
        pathname: `/logistics/hotels/${hotelReservation._id}`,
      },
      (request) => {
        expect(request.body.changes).not.to.have.property('itineraryActions');
        request.reply({ body: { reservation: hotelReservation } });
      },
    ).as('saveWithoutRemovedAction');
    cy.get('[data-cy="nav-logistics"]').click();
    cy.get(`[data-cy="edit-reservation-${hotelReservation._id}"]`).click({
      force: true,
    });
    advanceToItinerary();
    cy.get('[data-cy="action-hotel_checkin"]').should('be.checked');
    cy.get('[data-cy="accommodation-cancel"]').click();
    cy.get('[data-cy="nav-itinerary"]').click();
    cy.get(`[data-cy="delete-event-${reservationEvent._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="delete-event-confirm"]').click();
    cy.get(`[data-cy="event-card-${reservationEvent._id}"]`).should(
      'not.exist',
    );
    cy.get('[data-cy="nav-logistics"]').click();
    cy.get(`[data-cy="edit-reservation-${hotelReservation._id}"]`).click({
      force: true,
    });
    advanceToItinerary();
    cy.get('[data-cy="action-hotel_checkin"]').should('not.be.checked');
    cy.get('[data-cy="action-hotel_checkout"]').should('be.checked');
    cy.get('[data-cy="accommodation-save"]').click();
    cy.wait('@saveWithoutRemovedAction');
  });

  it('refreshes recently cached events immediately after creating, editing and deleting a booking', () => {
    let reservations: object[] = [];
    let events: object[] = [];
    cy.intercept(
      { method: 'POST', pathname: '/logistics/hotels' },
      (request) => {
        const reservation = { ...hotelReservation, ...request.body };
        reservations = [reservation];
        expect(request.body.itineraryActions).to.have.length(2);
        events = [
          { ...reservationEvent, title: reservation.name },
          { ...checkoutEvent, title: reservation.name },
        ];
        request.reply({
          statusCode: 201,
          body: { reservation, events, event: events[0] },
        });
      },
    );
    cy.intercept(
      {
        method: 'PATCH',
        pathname: `/logistics/hotels/${hotelReservation._id}`,
      },
      (request) => {
        const reservation = {
          ...hotelReservation,
          ...request.body.changes,
          version: 1,
        };
        reservations = [reservation];
        events = [
          { ...reservationEvent, title: reservation.name },
          { ...checkoutEvent, title: reservation.name },
        ];
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
    advanceToItinerary();
    cy.get('[data-cy="hotel_checkin-start"]').type(actionInput.checkin);
    cy.get('[data-cy="hotel_checkout-start"]').type(actionInput.checkout);
    cy.get('[data-cy="accommodation-save"]').click();
    cy.get(`[data-cy="reservation-card-${hotelReservation._id}"]`).should(
      'exist',
    );
    cy.get('[data-cy="nav-itinerary"]').click();
    cy.get(`[data-cy="event-card-${reservationEvent._id}"]`).should(
      'contain',
      hotelReservation.name,
    );

    cy.get(
      `[data-cy="event-card-${reservationEvent._id}"] [data-cy="event-type-badge"]`,
    ).should('contain.text', 'Hotel check-in');
    cy.get(
      `[data-cy="event-card-${checkoutEvent._id}"] [data-cy="event-type-badge"]`,
    ).should('contain.text', 'Hotel check-out');
    cy.get(`[data-cy="event-card-${reservationEvent._id}"]`).screenshot(
      'typed-event-badge-desktop',
    );
    cy.viewport(390, 844);
    cy.get(`[data-cy="event-card-${reservationEvent._id}"]`)
      .scrollIntoView()
      .screenshot('typed-event-badge-mobile');
    cy.viewport(1000, 660);
    cy.get('[data-cy="nav-logistics"]').click();
    cy.get(`[data-cy="edit-reservation-${hotelReservation._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="accommodation-name"]').clear().type(updatedHotelName);
    advanceToItinerary();
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
