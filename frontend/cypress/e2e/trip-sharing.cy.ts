import sharingFixture from '../fixtures/trip-sharing.json';
import { visitAsUser } from '../support/auth';

type TripRole = 'owner' | 'viewer';

/**
 * Opens the trip settings with friends and membership state mocked.
 *
 * @param role - Trip role used to seed the authenticated account.
 * @returns Nothing; Cypress queues API interception and navigation actions.
 */
const openTripSettings = (role: TripRole = 'owner') => {
  const trip = {
    version: 0,
    _id: sharingFixture.tripId,
    name: sharingFixture.tripName,
    startDate: sharingFixture.startDate,
    endDate: sharingFixture.endDate,
    isPublic: false,
    currentUserRole: role,
    users: [
      sharingFixture.ownerId,
      sharingFixture.viewerId,
      sharingFixture.memberId,
    ],
  };

  cy.intercept(
    { method: 'GET', pathname: '/itinerary' },
    {
      body: {
        _id: sharingFixture.itineraryId,
        tripId: sharingFixture.tripId,
        version: 0,
        title: 'Weekend itinerary',
        description: '',
        startDate: sharingFixture.startDate,
        endDate: sharingFixture.endDate,
      },
    },
  );
  cy.intercept({ method: 'GET', pathname: '/event' }, { body: [] });
  cy.intercept(
    { method: 'GET', pathname: '/logistics/*' },
    { body: { reservations: [] } },
  );
  cy.intercept(
    { method: 'GET', pathname: '/users/friends' },
    {
      body: {
        friends: [sharingFixture.friend, sharingFixture.member],
        incomingRequests: [],
        outgoingRequests: [],
      },
    },
  );
  cy.intercept('GET', '**/trip', { body: [trip] }).as('tripList');
  cy.intercept('GET', `**/trip/${sharingFixture.tripId}`, { body: trip });

  visitAsUser('/my-trips', role);
  cy.wait('@tripList');
  cy.get(`[data-cy="trip-card-${sharingFixture.tripId}"]`).click();
  cy.get('[data-cy="nav-settings"]').click();
  cy.get('[data-cy="trip-settings-title"]').should('be.visible');
};

describe('trip sharing', () => {
  [false, true].forEach((rejectInvitation) => {
    it(`creates a trip and ${rejectInvitation ? 'reports an unsent invitation without losing the trip' : 'invites selected friends'}`, () => {
      cy.intercept('GET', '**/trip', { body: [] });
      cy.intercept('GET', '**/users/friends', {
        body: {
          friends: [sharingFixture.friend, sharingFixture.member],
          incomingRequests: [],
          outgoingRequests: [],
        },
      });
      cy.intercept('POST', '**/trip', {
        body: { savedTrip: { _id: sharingFixture.tripId } },
      }).as('createTrip');
      cy.intercept('POST', '**/itinerary', {
        body: { _id: sharingFixture.itineraryId },
      }).as('createItinerary');
      cy.intercept('POST', `**/trip/${sharingFixture.tripId}/share`, {
        statusCode: rejectInvitation ? 500 : 201,
        body: {
          message: rejectInvitation
            ? 'Unavailable'
            : 'Trip invitations created',
        },
      }).as('shareTrip');

      visitAsUser('/my-trips');
      cy.get('[data-cy="new-trip"]').click();
      cy.get('[data-cy="trip-name"]').type(sharingFixture.tripName);
      cy.get('[data-cy="trip-start-date"]').type(
        sharingFixture.startDate.slice(0, 10),
      );
      cy.get('[data-cy="trip-end-date"]').type(
        sharingFixture.endDate.slice(0, 10),
      );
      cy.get('[data-cy="share-trip-dropdown"]').should('not.exist');
      cy.get('[data-cy="share-trip-friend-search"]')
        .focus()
        .type('{downarrow}{enter}');
      cy.get('[data-cy="share-trip-combobox"]')
        .find(`[data-cy="share-trip-selected-${sharingFixture.friendId}"]`)
        .should('be.visible');
      cy.get(
        `[data-cy="share-trip-friend-${sharingFixture.memberId}"]`,
      ).click();
      cy.get(`[data-cy="share-trip-friend-${sharingFixture.memberId}"]`)
        .click()
        .should('have.attr', 'aria-selected', 'false');
      cy.get(`[data-cy="share-trip-friend-${sharingFixture.friendId}"]`)
        .should('have.attr', 'aria-selected', 'true')
        .and('not.have.css', 'background-color', 'rgba(0, 0, 0, 0)');
      cy.get('[data-cy="share-trip-friend-search"]').type('no match');
      cy.get(`[data-cy="share-trip-selected-${sharingFixture.friendId}"]`)
        .should('be.visible')
        .and('contain.text', sharingFixture.friend.username)
        .click();
      cy.get(
        `[data-cy="share-trip-selected-${sharingFixture.friendId}"]`,
      ).should('not.exist');
      cy.get('[data-cy="share-trip-friend-search"]')
        .should('be.focused')
        .clear();
      cy.get(`[data-cy="share-trip-friend-${sharingFixture.friendId}"]`)
        .should('have.attr', 'aria-selected', 'false')
        .click();
      cy.get('[data-cy="share-trip-friend-search"]')
        .type('{esc}')
        .should('have.attr', 'aria-expanded', 'false');
      cy.get('[data-cy="share-trip-dropdown"]').should('not.exist');
      cy.get('[data-cy="trip-name"]').should('be.visible');
      cy.get('[data-cy="share-trip-friend-search"]').focus();
      cy.get(
        `[data-cy="share-trip-friend-${sharingFixture.memberId}"]`,
      ).click();
      cy.get('[data-cy="create-trip"]').click();

      cy.wait('@createTrip');
      cy.wait('@createItinerary');
      cy.wait('@shareTrip')
        .its('request.body')
        .should('deep.equal', {
          recipientIds: [sharingFixture.friendId, sharingFixture.memberId],
        });
      cy.get('@shareTrip.all').should('have.length', 1);
      cy.get('[data-cy="trip-name"]').should('not.exist');
      if (rejectInvitation) {
        cy.get('[data-cy="toast"]').should(
          'contain.text',
          'Trip created with unsent invitations',
        );
      }
    });
  });

  it('sends an invitation to the selected existing friend', () => {
    openTripSettings();
    cy.intercept('POST', `**/trip/${sharingFixture.tripId}/share`, {
      statusCode: 201,
      body: { message: 'Trip invitations created' },
    }).as('shareTrip');

    cy.get('[data-cy="share-trip-open"]').click();
    cy.get('[data-cy="share-trip-dialog"]').should('be.visible');
    cy.get('[data-cy="share-trip-friend-search"]').focus();
    cy.get(`[data-cy="share-trip-friend-${sharingFixture.friendId}"]`)
      .should('be.enabled')
      .click();
    cy.get('[data-cy="share-trip-dropdown"]').should('not.exist');
    cy.get(`[data-cy="share-trip-selected-${sharingFixture.friendId}"]`).should(
      'be.visible',
    );
    cy.get('[data-cy="share-trip-submit"]').click();

    cy.wait('@shareTrip')
      .its('request.body')
      .should('deep.equal', { recipientIds: [sharingFixture.friendId] });
    cy.get('[data-cy="toast"]')
      .contains('Trip invitations created')
      .should('exist');
    cy.get('[data-cy="share-trip-dialog"]').should('not.exist');
  });

  it('marks existing trip members as unavailable and filters friends', () => {
    openTripSettings();
    cy.get('[data-cy="share-trip-open"]').click();
    cy.get('[data-cy="share-trip-friend-search"]').focus();
    cy.get(`[data-cy="share-trip-friend-${sharingFixture.memberId}"]`).should(
      'be.disabled',
    );
    cy.get(`[data-cy="share-trip-member-badge-${sharingFixture.memberId}"]`)
      .should('be.visible')
      .and('contain.text', 'Already a participant');

    cy.get('[data-cy="share-trip-friend-search"]').type('trav');
    cy.get('[data-cy="share-trip-friends"]').should(
      'contain.text',
      sharingFixture.friend.username,
    );
    cy.get('[data-cy="share-trip-friends"]').should(
      'not.contain.text',
      sharingFixture.member.username,
    );
  });

  it('reports a rejected invitation and keeps the selection available to retry', () => {
    openTripSettings();
    cy.intercept('POST', `**/trip/${sharingFixture.tripId}/share`, {
      statusCode: 409,
      body: { message: 'A pending invitation already exists for this user' },
    }).as('shareTrip');

    cy.get('[data-cy="share-trip-open"]').click();
    cy.get('[data-cy="share-trip-friend-search"]').focus();
    cy.get(`[data-cy="share-trip-friend-${sharingFixture.friendId}"]`).click();
    cy.get('[data-cy="share-trip-submit"]').click();
    cy.wait('@shareTrip');

    cy.get('[data-cy="toast"]')
      .contains('A pending invitation already exists for this user')
      .should('exist');
    cy.get('[data-cy="share-trip-dialog"]').should('be.visible');
    cy.get('[data-cy="share-trip-submit"]').should('be.enabled');
  });

  it('does not offer sharing to a viewer', () => {
    openTripSettings('viewer');
    cy.get('[data-cy="share-trip-open"]').should('not.exist');
  });
});
