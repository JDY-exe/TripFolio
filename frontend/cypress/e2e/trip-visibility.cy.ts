import tripFixture from '../fixtures/trip-visibility.json';

type TripRole = 'owner' | 'viewer';

/**
 * Opens a trip's Settings tab after seeding a session and intercepting its API.
 *
 * @param role - Membership role used to load the visibility control.
 * @returns Nothing; Cypress commands are queued to open the selected trip.
 */
const openTripSettings = (role: TripRole) => {
  const userId = role === 'owner' ? tripFixture.ownerId : tripFixture.viewerId;
  const user = {
    id: userId,
    username: role,
    email: `${role}@tripfolio.test`,
    friends: [],
  };
  const token = `header.${btoa(JSON.stringify({ exp: 4102444800 }))}.signature`;
  const trip = {
    _id: tripFixture.tripId,
    name: tripFixture.tripName,
    startDate: tripFixture.startDate,
    endDate: tripFixture.endDate,
    isPublic: false,
    currentUserRole: role,
  };

  cy.intercept('GET', '**/users/me', { body: { user } });
  cy.intercept('GET', '**/itinerary*', {
    body: {
      _id: tripFixture.itineraryId,
      tripId: tripFixture.tripId,
      title: 'Weekend itinerary',
      description: '',
      startDate: tripFixture.startDate,
      endDate: tripFixture.endDate,
    },
  });
  cy.intercept('GET', '**/event*', { body: [] });
  cy.intercept('GET', '**/trip', { body: [trip] });
  cy.intercept('GET', `**/trip/${tripFixture.tripId}`, { body: trip });
  cy.visit('/my-trips', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'tripfolio.auth.v1',
        JSON.stringify({ token, user }),
      );
    },
  });
  cy.get(`a[href="/trip/${tripFixture.tripId}"]`).click();
  cy.contains('nav button', 'Settings').click();
  cy.contains('h2', 'Trip settings').should('be.visible');
};

describe('trip visibility settings', () => {
  it('sends the selected visibility when creating a trip', () => {
    const user = {
      id: tripFixture.ownerId,
      username: 'owner',
      email: 'owner@tripfolio.test',
      friends: [],
    };
    const token = `header.${btoa(JSON.stringify({ exp: 4102444800 }))}.signature`;
    let trips: Array<Record<string, unknown>> = [];

    cy.intercept('GET', '**/users/me', { body: { user } });
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

    cy.visit('/my-trips', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'tripfolio.auth.v1',
          JSON.stringify({ token, user }),
        );
      },
    });
    cy.contains('button', 'New Trip').click();
    cy.get('#trip-name').type('Public city break');
    cy.get('#trip-start-date').type('2030-04-01');
    cy.get('#trip-end-date').type('2030-04-05');
    cy.contains('label', 'Make this trip public').find('input').check();
    cy.contains('button', 'Create Trip').click();

    cy.wait('@createTrip').its('request.body.isPublic').should('eq', true);
    cy.wait('@createItinerary');
    cy.contains('h2', 'Public city break').should('be.visible');
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

    cy.get('[role="switch"][aria-label="Public trip"]').check();
    cy.wait('@setVisibility')
      .its('request.body')
      .should('deep.equal', { isPublic: true });
    cy.get('[role="switch"][aria-label="Public trip"]').should('be.checked');
    cy.contains('Visible to any signed-in TripFolio user.').should(
      'be.visible',
    );
  });

  it('keeps the visibility switch disabled for viewers', () => {
    openTripSettings('viewer');

    cy.get('[role="switch"][aria-label="Public trip"]')
      .should('be.disabled')
      .and('not.be.checked');
    cy.contains('Only the trip owner can change visibility.').should(
      'be.visible',
    );
  });
});
