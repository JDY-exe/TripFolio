import navigation from '../fixtures/navigation.json';
import tripFixture from '../fixtures/trip-visibility.json';
import { visitAsUser } from '../support/auth';

describe('Navigation', () => {
  beforeEach(() => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    cy.intercept(
      { method: 'GET', pathname: '/itinerary' },
      {
        body: {
          _id: tripFixture.itineraryId,
          tripId: tripFixture.tripId,
          title: 'Weekend itinerary',
          description: '',
          startDate: tripFixture.startDate,
          endDate: tripFixture.endDate,
        },
      },
    );
    cy.intercept({ method: 'GET', pathname: '/event' }, { body: [] });
    cy.intercept(
      { method: 'GET', pathname: '/api/itineraries/feed' },
      {
        body: { items: [], nextPage: null },
      },
    );
    cy.intercept(
      { method: 'GET', pathname: '/logistics/*' },
      {
        body: { reservations: [] },
      },
    );
  });

  it('redirects to My Trips and opens the main destinations', () => {
    visitAsUser('/');
    cy.location('pathname').should('eq', navigation.tripsPath);

    for (const destination of navigation.destinations) {
      cy.get(`[data-cy="nav-${destination.path.slice(1)}"]`).click();
      cy.location('pathname').should('eq', destination.path);
    }
  });

  it('switches trip sections locally and returns to My Trips', () => {
    visitAsUser(navigation.tripPath);
    cy.get(
      `[data-cy="trip-section-${navigation.sections[0].toLowerCase()}"]`,
    ).should('contain.text', navigation.sections[0]);

    for (const section of navigation.sections.slice(1)) {
      cy.get(`[data-cy="nav-${section.toLowerCase()}"]`).click();
      cy.get(`[data-cy="trip-section-${section.toLowerCase()}"]`).should(
        'contain.text',
        section,
      );
      cy.location('pathname').should('eq', navigation.tripPath);
    }

    cy.get('[data-cy="nav-back"]').click();
    cy.location('pathname').should('eq', navigation.tripsPath);
  });
});
