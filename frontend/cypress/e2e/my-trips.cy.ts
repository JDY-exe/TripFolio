import featureFixture from '../fixtures/owned-features.json';
import { visitAsUser } from '../support/auth';

describe('My Trips', () => {
  it('shows an empty state', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    visitAsUser('/my-trips');
    cy.contains('No trips found. Create one to get started!').should('exist');
  });

  it('opens a populated trip card', () => {
    cy.intercept(
      { method: 'GET', pathname: '/trip' },
      { body: [featureFixture.trip] },
    );
    cy.intercept(
      { method: 'GET', pathname: '/itinerary' },
      {
        body: featureFixture.itinerary,
      },
    );
    cy.intercept({ method: 'GET', pathname: '/event' }, { body: [] });
    visitAsUser('/my-trips');
    cy.get(`[data-cy="trip-card-container-${featureFixture.trip._id}"]`)
      .find('[data-cy="trip-card-title"]')
      .should('have.text', featureFixture.trip.name);
    cy.get(`[data-cy="trip-card-${featureFixture.trip._id}"]`).click();
    cy.location('pathname').should('eq', `/trip/${featureFixture.trip._id}`);
  });

  it('rejects reversed dates before creating a trip', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    cy.intercept(
      { method: 'POST', pathname: '/trip' },
      {
        statusCode: 500,
      },
    ).as('createTrip');
    visitAsUser('/my-trips');
    cy.get('[data-cy="new-trip"]').click();
    cy.get('[data-cy="trip-name"]').type('Backwards trip');
    cy.get('[data-cy="trip-start-date"]').type('2030-04-05');
    cy.get('[data-cy="trip-end-date"]').type('2030-04-01');
    cy.get('[data-cy="create-trip"]').click();
    cy.get('[data-cy="create-trip-error"]').should(
      'contain.text',
      'Ending date must come after starting date.',
    );
    cy.get('@createTrip.all').should('have.length', 0);
  });

  it('keeps the form open when the create request fails', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    cy.intercept(
      { method: 'POST', pathname: '/trip' },
      {
        statusCode: 500,
        body: { message: 'Server error' },
      },
    ).as('createTrip');
    visitAsUser('/my-trips');
    cy.get('[data-cy="new-trip"]').click();
    cy.get('[data-cy="trip-name"]').type('Weekend trip');
    cy.get('[data-cy="trip-start-date"]').type('2030-04-01');
    cy.get('[data-cy="trip-end-date"]').type('2030-04-05');
    cy.get('[data-cy="create-trip"]').click();

    cy.wait('@createTrip');
    cy.get('[data-cy="create-trip-error"]').should(
      'contain.text',
      'Failed to create trip. Please try again.',
    );
    cy.get('[data-cy="trip-name"]').should('have.value', 'Weekend trip');
  });
});
