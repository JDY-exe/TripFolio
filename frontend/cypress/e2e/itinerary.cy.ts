import featureFixture from '../fixtures/owned-features.json';
import { visitOwnedTrip } from '../support/ownedTrip';

describe('trip itinerary', () => {
  it('shows trip days and saves an edited description', () => {
    cy.intercept(
      {
        method: 'PATCH',
        pathname: `/itinerary/${featureFixture.itinerary._id}`,
      },
      (request) =>
        request.reply({
          body: { ...featureFixture.itinerary, ...request.body },
        }),
    ).as('saveDescription');
    visitOwnedTrip();
    cy.get('[data-cy="trip-section-itinerary"]').should(
      'contain.text',
      'Itinerary',
    );
    cy.get('[data-cy="day-toggle-2030-04-01"]').click();
    cy.get('[data-cy="day-toggle-2030-04-01"]').should(
      'have.attr',
      'aria-pressed',
      'true',
    );
    cy.get('[data-cy="description-edit"]').click();
    cy.get('[data-cy="description-input"]')
      .clear()
      .type('Updated seaside plans');
    cy.get('[data-cy="description-save"]').click();
    cy.wait('@saveDescription')
      .its('request.body.description')
      .should('eq', 'Updated seaside plans');
    cy.contains('Updated seaside plans').should('be.visible');
  });

  it('validates event times and creates an event with a selected place', () => {
    let events: object[] = [];
    cy.intercept(
      { method: 'GET', pathname: '/destination' },
      {
        body: { suggestions: [featureFixture.placeSuggestion] },
      },
    ).as('places');
    cy.intercept(
      { method: 'GET', pathname: '/event/*/photo' },
      {
        body: { photo: null },
      },
    );
    cy.intercept({ method: 'POST', pathname: '/event' }, (request) => {
      const savedEvent = { ...featureFixture.event, ...request.body };
      events = [savedEvent];
      request.reply({ body: savedEvent });
    }).as('createEvent');
    visitOwnedTrip(undefined, { events: () => events });
    cy.get('[data-cy="add-event-2030-04-01"]').click();
    cy.get('[data-cy="event-title"]').type(featureFixture.event.title);
    cy.get('[data-cy="event-start"]').clear().type('11:00');
    cy.get('[data-cy="event-end"]').clear().type('10:00');
    cy.get('[data-cy="event-save"]').click();
    cy.contains('End time cannot be before start time.').should('exist');
    cy.get('@createEvent.all').should('have.length', 0);
    cy.get('[data-cy="event-end"]').clear().type('12:00');
    cy.get('[data-cy="event-address"]').type('Ocean');
    cy.wait('@places');
    cy.get('[data-cy="place-option-place-ocean-pier"]').click();
    cy.get('[data-cy="event-save"]').click();
    cy.wait('@createEvent')
      .its('request.body.placeId')
      .should('eq', 'place-ocean-pier');
    cy.get(`[data-cy="event-card-${featureFixture.event._id}"]`).should(
      'contain.text',
      featureFixture.event.title,
    );
  });

  it('edits and deletes an existing event', () => {
    let events: object[] = [featureFixture.event];
    cy.intercept(
      { method: 'PATCH', pathname: `/event/${featureFixture.event._id}` },
      (request) => {
        const savedEvent = { ...featureFixture.event, ...request.body };
        events = [savedEvent];
        request.reply({ body: savedEvent });
      },
    ).as('editEvent');
    cy.intercept(
      { method: 'DELETE', pathname: `/event/${featureFixture.event._id}` },
      (request) => {
        events = [];
        request.reply({ statusCode: 204 });
      },
    ).as('deleteEvent');
    visitOwnedTrip(undefined, { events: () => events });
    cy.get(`[data-cy="event-card-${featureFixture.event._id}"]`).should(
      'contain.text',
      featureFixture.event.title,
    );
    cy.get(`[data-cy="edit-event-${featureFixture.event._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="event-title"]').clear().type('Updated pier visit');
    cy.get('[data-cy="event-save"]').click();
    cy.wait('@editEvent')
      .its('request.body.title')
      .should('eq', 'Updated pier visit');
    cy.get(`[data-cy="event-card-${featureFixture.event._id}"]`).should(
      'contain.text',
      'Updated pier visit',
    );
    cy.get(`[data-cy="delete-event-${featureFixture.event._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="delete-event-dialog"]').should('exist');
    cy.get('[data-cy="delete-event-confirm"]').click();
    cy.wait('@deleteEvent');
    cy.get(`[data-cy="event-card-${featureFixture.event._id}"]`).should(
      'not.exist',
    );
  });

  it('saves a custom event location when place search has no match', () => {
    cy.intercept(
      { method: 'GET', pathname: '/destination' },
      {
        body: { suggestions: [] },
      },
    );
    cy.intercept({ method: 'POST', pathname: '/event' }, (request) => {
      request.reply({ body: { ...featureFixture.event, ...request.body } });
    }).as('createEvent');
    visitOwnedTrip();
    cy.get('[data-cy="add-event-2030-04-01"]').click();
    cy.get('[data-cy="event-title"]').type('Morning walk');
    cy.get('[data-cy="event-address"]').type('A local beach');
    cy.contains('No matches. You can enter a custom location.').should('exist');
    cy.get('[data-cy="event-save"]').click();
    cy.wait('@createEvent').then(({ request }) => {
      expect(request.body.address).to.eq('A local beach');
      expect(request.body.placeId).to.equal(null);
    });
  });
});
