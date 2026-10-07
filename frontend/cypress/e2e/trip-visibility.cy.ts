import tripFixture from '../fixtures/trip-visibility.json';
import { visitAsUser } from '../support/auth';

type TripRole = 'owner' | 'viewer';

/**
 * Opens a trip's Settings tab after seeding a session and intercepting its API.
 *
 * @param role - Membership role used to load the visibility control.
 * @returns Nothing; Cypress commands are queued to open the selected trip.
 */
const openTripSettings = (role: TripRole) => {
  const trip = {
    _id: tripFixture.tripId,
    name: tripFixture.tripName,
    startDate: tripFixture.startDate,
    endDate: tripFixture.endDate,
    isPublic: false,
    currentUserRole: role,
  };

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
  cy.intercept('GET', '**/trip', { body: [trip] }).as('tripList');
  cy.intercept('GET', `**/trip/${tripFixture.tripId}`, { body: trip });
  visitAsUser('/my-trips', role);
  cy.get('[data-cy="my-trips-title"]').should(
    'contain.text',
    'My Upcoming Trips',
  );
  cy.wait('@tripList')
    .its('response.body.0._id')
    .should('eq', tripFixture.tripId);
  cy.get(`[data-cy="trip-card-${tripFixture.tripId}"]`).click();
  cy.get('[data-cy="nav-settings"]').click();
  cy.get('[data-cy="trip-settings-title"]').should(
    'contain.text',
    'Trip settings',
  );
};

describe('trip visibility settings', () => {
  it('sends the selected visibility when creating a trip', () => {
    let trips: Array<Record<string, unknown>> = [];

    cy.intercept('GET', '**/trip', (request) => request.reply({ body: trips }));
    cy.intercept('POST', '**/trip', (request) => {
      expect(request.body.isPublic).to.equal(true);
      const trip = {
        _id: tripFixture.tripId,
        name: request.body.name,
        startDate: request.body.startDate,
        endDate: request.body.endDate,
        isPublic: request.body.isPublic,
      };
      trips = [trip];
      request.reply({ body: { savedTrip: trip } });
    }).as('createTrip');
    cy.intercept('POST', '**/itinerary', {
      body: { _id: tripFixture.itineraryId },
    }).as('createItinerary');

    visitAsUser('/my-trips');
    cy.get('[data-cy="new-trip"]').click();
    cy.get('[data-cy="trip-name"]').type('Public city break');
    cy.get('[data-cy="trip-start-date"]').type('2030-04-01');
    cy.get('[data-cy="trip-end-date"]').type('2030-04-05');
    cy.get('[data-cy="trip-public"]').check();
    cy.get('[data-cy="create-trip"]').click();

    cy.wait('@createTrip').its('request.body.isPublic').should('eq', true);
    cy.wait('@createItinerary');
    cy.get(`[data-cy="trip-card-container-${tripFixture.tripId}"]`)
      .find('[data-cy="trip-card-title"]')
      .should('have.text', 'Public city break');
  });

  it('lets the owner make a trip public', () => {
    openTripSettings('owner');
    cy.intercept('PATCH', `**/trip/${tripFixture.tripId}/visibility`, {
      body: {
        _id: tripFixture.tripId,
        isPublic: true,
        currentUserRole: 'owner',
      },
    }).as('setVisibility');

    cy.get('[data-cy="trip-visibility"]').check();
    cy.wait('@setVisibility')
      .its('request.body')
      .should('deep.equal', { isPublic: true });
    cy.get('[data-cy="trip-visibility"]').should('be.checked');
    cy.contains(
      'Only trip owners and members can access confidential information such as flights and hotels.',
    ).should('be.visible');
  });

  it('keeps the visibility switch disabled for viewers', () => {
    openTripSettings('viewer');

    cy.get('[data-cy="trip-visibility"]')
      .should('be.disabled')
      .and('not.be.checked');
    cy.contains('Only the trip owner can change visibility.').should(
      'be.visible',
    );
  });

  it('reports a rejected visibility update without changing the saved setting', () => {
    openTripSettings('owner');
    cy.intercept('PATCH', `**/trip/${tripFixture.tripId}/visibility`, {
      statusCode: 500,
      body: { message: 'Visibility failed' },
    }).as('setVisibility');
    cy.get('[data-cy="trip-visibility"]').check();
    cy.wait('@setVisibility');
    cy.get('[data-cy="toast"]').contains('Visibility failed').should('exist');
    cy.get('[data-cy="trip-visibility"]').should('not.be.checked');
  });

  it('cancels deletion without sending a request', () => {
    openTripSettings('owner');
    cy.intercept('DELETE', `**/trip/${tripFixture.tripId}`, {
      statusCode: 204,
    }).as('deleteTrip');
    cy.get('[data-cy="delete-trip-open"]').click();
    cy.get('[data-cy="delete-trip-dialog"]').should(
      'contain.text',
      `Delete ${tripFixture.tripName}?`,
    );
    cy.get('[data-cy="delete-trip-cancel"]').click();
    cy.get('[data-cy="delete-trip-dialog"]').should('not.exist');
    cy.get('@deleteTrip.all').should('have.length', 0);
  });

  it('deletes a trip after confirmation and returns to My Trips', () => {
    openTripSettings('owner');
    cy.intercept('DELETE', `**/trip/${tripFixture.tripId}`, {
      statusCode: 204,
    }).as('deleteTrip');
    cy.get('[data-cy="delete-trip-open"]').click();
    cy.get('[data-cy="delete-trip-dialog"]').should('exist');
    cy.get('[data-cy="delete-trip-confirm"]').click();
    cy.wait('@deleteTrip');
    cy.location('pathname').should('eq', '/my-trips');
    cy.get('[data-cy="toast"]').contains('Trip deleted.').should('exist');
  });
});
