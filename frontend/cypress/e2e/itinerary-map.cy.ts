import fixture from '../fixtures/itinerary-map.json';
import { visitOwnedTrip } from '../support/ownedTrip';

describe('day-following itinerary map', () => {
  beforeEach(() => {
    cy.viewport(1280, 1000);
    cy.intercept('GET', 'https://tiles.openfreemap.org/styles/*', {
      body: fixture.style,
    });
    cy.intercept(
      { method: 'GET', pathname: '/event/*/location' },
      (request) => {
        const id = new URL(request.url).pathname.split(
          '/',
        )[2] as keyof typeof fixture.locations;
        request.reply({ body: { location: fixture.locations[id] ?? null } });
      },
    );
  });

  it('follows the visible day, dims other days, and reuses event cards in the modal', () => {
    visitOwnedTrip(undefined, { events: () => fixture.events });
    cy.get(
      '[data-cy="itinerary-map-preview"] [data-cy="map-pin-map-museum"]',
    ).should('exist');
    cy.get('[data-cy="itinerary-map"]').should('contain.text', 'Day 1');
    cy.get('[data-cy="day-toggle-2030-04-02"]').scrollIntoView();
    cy.get('[data-cy="itinerary-map"]').should('contain.text', 'Day 2');
    cy.get(
      '[data-cy="itinerary-map-preview"] [data-cy="map-pin-map-beach"]',
    ).should('have.class', 'itinerary-map-pin-active');
    cy.get(
      '[data-cy="itinerary-map-preview"] [data-cy="map-pin-map-museum"]',
    ).should('not.have.class', 'itinerary-map-pin-active');
    cy.get('[data-cy="expand-itinerary-map"]').click();
    cy.get(
      '[data-cy="expanded-itinerary-map"] [data-cy="map-pin-map-beach"]',
    ).click();
    cy.get(
      '[data-cy="map-event-popup"] [data-cy="event-card-map-beach"]',
    ).should('be.visible');
    cy.get(
      '[data-cy="map-event-popup"] [data-cy="edit-event-map-beach"]',
    ).click({ force: true });
    cy.get('[data-cy="event-title"]').should('have.value', 'Beach walk');
  });

  it('shows every event at a shared venue on hover', () => {
    visitOwnedTrip(undefined, { events: () => fixture.events });
    cy.get('[data-cy="expand-itinerary-map"]')
      .should('not.be.disabled')
      .click();
    cy.get(
      '[data-cy="expanded-itinerary-map"] .itinerary-map-pin-active',
    ).should('not.exist');
    cy.get(
      '[data-cy="expanded-itinerary-map"] [data-cy="map-pin-map-museum"]',
    ).trigger('mouseenter');
    cy.get(
      '[data-cy="expanded-itinerary-map"] [data-cy="map-pin-map-museum"]',
    ).should('have.class', 'itinerary-map-pin-active');
    cy.get(
      '[data-cy="expanded-itinerary-map"] [data-cy="map-pin-map-beach"]',
    ).should('not.have.class', 'itinerary-map-pin-active');
    cy.get('[data-cy="map-event-popup"]').trigger('mouseenter');
    cy.get(
      '[data-cy="map-event-popup"] [data-cy="event-card-map-museum"]',
    ).should('be.visible');
    cy.get(
      '[data-cy="map-event-popup"] [data-cy="event-card-map-lunch"]',
    ).should('exist');
    cy.get('[data-cy="map-event-popup"]').trigger('mouseout');
    cy.get('[data-cy="map-event-popup"]').should('not.exist');
    cy.get(
      '[data-cy="expanded-itinerary-map"] .itinerary-map-pin-active',
    ).should('not.exist');
    cy.get(
      '[data-cy="expanded-itinerary-map"] [data-cy="map-pin-map-museum"]',
    ).click();
    cy.get(
      '[data-cy="expanded-itinerary-map"] [data-cy="map-pin-map-museum"]',
    ).trigger('mouseleave');
    cy.get('[data-cy="map-event-popup"]').should('not.exist');
  });

  it('keeps the itinerary usable when location lookup fails', () => {
    cy.intercept(
      { method: 'GET', pathname: '/event/*/location' },
      { statusCode: 503 },
    );
    visitOwnedTrip(undefined, { events: () => fixture.events });
    cy.get('[data-cy="itinerary-map"]').should(
      'contain.text',
      'Retry location lookup',
    );
    cy.get('[data-cy="event-card-map-museum"]').should('be.visible');
  });

  it('uses saved event coordinates without location lookup requests', () => {
    cy.intercept(
      { method: 'GET', pathname: '/event/*/location' },
      { statusCode: 503 },
    ).as('locationLookup');
    visitOwnedTrip(undefined, {
      events: () =>
        fixture.events.map((event) => ({
          ...event,
          ...fixture.locations[event._id as keyof typeof fixture.locations],
        })),
    });
    cy.get(
      '[data-cy="itinerary-map-preview"] [data-cy="map-pin-map-museum"]',
    ).should('exist');
    cy.get('@locationLookup.all').should('have.length', 0);
  });
});
