import fixture from '../fixtures/archived-trip';
import sharedRecipientFixture from '../fixtures/archived-shared-recipient';
import noteFixture from '../fixtures/archived-notes.json';
import { visitAsUser } from '../support/auth';

/** Stubs trip browsing APIs with archived content while keeping active lists separate.
 * @returns Nothing; Cypress queues the API intercepts.
 */
const mockArchivedTrip = () => {
  cy.intercept('GET', '**/trip', { body: [fixture.activeTrip] });
  cy.intercept('GET', '**/trip/archived', { body: [fixture.trip] });
  cy.intercept(
    {
      method: 'GET',
      hostname: 'localhost',
      pathname: `/trip/${fixture.trip._id}`,
    },
    { body: fixture.trip },
  );
  cy.intercept(
    { method: 'GET', pathname: '/itinerary' },
    { body: fixture.itinerary },
  );
  cy.intercept(
    { method: 'GET', pathname: `/itinerary/${fixture.trip._id}/notes` },
    { body: 'null', headers: { 'content-type': 'application/json' } },
  );
  cy.intercept(
    { method: 'GET', pathname: '/event' },
    { body: [fixture.event] },
  );
  cy.intercept(
    { method: 'GET', pathname: '/event/*/photo' },
    { body: { photo: null } },
  );
  cy.intercept(
    { method: 'GET', pathname: '/logistics/flights' },
    { body: { reservations: [fixture.flight] } },
  );
  cy.intercept(
    { method: 'GET', pathname: '/logistics/hotels' },
    { body: { reservations: [fixture.accommodation] } },
  );
  cy.intercept(
    { method: 'GET', pathname: '/logistics/rental_cars' },
    { body: { reservations: [fixture.rental] } },
  );
  cy.intercept(
    { method: 'GET', pathname: '/trip/*/photos' },
    { body: { photos: [fixture.photo], nextCursor: null } },
  );
  cy.intercept(
    { method: 'GET', pathname: '/trip/*/photos/*/content' },
    { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
  );
};

describe('archived trips reuse shared views', () => {
  beforeEach(mockArchivedTrip);

  it('labels trips shared with the current user', () => {
    cy.intercept('GET', '**/trip/archived', {
      body: [{ ...fixture.trip, sharedWithYou: true }],
    });

    visitAsUser('/archived-trips');
    cy.get('[data-cy="shared-with-you-badge"]').should(
      'contain.text',
      'Shared with you',
    );
  });

  it('lets an owner share an archived trip with a friend', () => {
    cy.intercept('GET', '**/users/friends', {
      body: {
        friends: [fixture.friend],
        incomingRequests: [],
        outgoingRequests: [],
      },
    });
    cy.intercept('POST', `**/trip/${fixture.trip._id}/share-archive`, {
      statusCode: 201,
      body: {
        message: 'Archived trip shared successfully',
        tripId: fixture.trip._id,
        recipientId: fixture.friend.id,
      },
    }).as('shareArchivedTrip');

    visitAsUser(`/trip/archived/${fixture.trip._id}`);
    cy.get('[data-cy="share-archived-trip-open"]').click();
    cy.get('[data-cy="share-archived-trip-dialog"]').should('be.visible');
    cy.get('[data-cy="share-trip-friend-search"]').focus();
    cy.get(`[data-cy="share-trip-friend-${fixture.friend.id}"]`)
      .should('be.enabled')
      .click();
    cy.get('[data-cy="share-archived-trip-submit"]').click();

    cy.wait('@shareArchivedTrip')
      .its('request.body')
      .should('deep.equal', { recipientId: fixture.friend.id });
    cy.get('[data-cy="share-archived-trip-dialog"]').should('not.exist');
    cy.get('[data-cy="toast"]').should(
      'contain.text',
      'Archived trip shared successfully',
    );
  });

  it('keeps the share dialog open and reports a failed grant', () => {
    cy.intercept('GET', '**/users/friends', {
      body: {
        friends: [fixture.friend],
        incomingRequests: [],
        outgoingRequests: [],
      },
    });
    cy.intercept('POST', `**/trip/${fixture.trip._id}/share-archive`, {
      statusCode: 403,
      body: { message: 'Only trip owners and editors can share this trip' },
    }).as('shareArchivedTrip');

    visitAsUser(`/trip/archived/${fixture.trip._id}`);
    cy.get('[data-cy="share-archived-trip-open"]').click();
    cy.get('[data-cy="share-trip-friend-search"]').focus();
    cy.get(`[data-cy="share-trip-friend-${fixture.friend.id}"]`).click();
    cy.get('[data-cy="share-archived-trip-submit"]').click();

    cy.wait('@shareArchivedTrip');
    cy.get('[data-cy="share-archived-trip-dialog"]').should('be.visible');
    cy.get('[data-cy="toast"]').should(
      'contain.text',
      'Only trip owners and editors can share this trip',
    );
  });

  it('does not offer archived sharing to read-only trip participants', () => {
    cy.intercept(
      { method: 'GET', pathname: `/trip/${fixture.trip._id}` },
      { body: { ...fixture.trip, currentUserRole: 'viewer' } },
    );

    visitAsUser(`/trip/archived/${fixture.trip._id}`, 'viewer');
    cy.get('[data-cy="share-archived-trip-open"]').should('not.exist');
  });

  it('lets a recipient open a shared trip and keeps it read-only', () => {
    cy.intercept('GET', '**/trip/archived', {
      body: [sharedRecipientFixture.archivedTrip],
    });
    cy.intercept(
      { method: 'GET', pathname: `/trip/${fixture.trip._id}` },
      { body: sharedRecipientFixture.trip },
    );

    visitAsUser('/archived-trips', 'viewer');
    cy.get('[data-cy="shared-with-you-badge"]').should(
      'contain.text',
      'Shared with you',
    );
    cy.get(`[data-cy="trip-card-${fixture.trip._id}"]`).click();

    cy.get('[data-cy="trip-section-itinerary"]').should(
      'contain.text',
      'Archived Itinerary',
    );
    cy.contains(fixture.event.title).should('be.visible');
    cy.get('[data-cy="share-archived-trip-open"]').should('not.exist');
    cy.get('[data-cy^="add-event-"]').should('not.exist');
    cy.get('[data-cy^="edit-event-"]').should('not.exist');
    cy.get('[data-cy^="delete-event-"]').should('not.exist');

    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="trip-visibility"]').should('be.disabled');
    cy.get('[data-cy="share-trip-open"]').should('not.exist');
    cy.get('[data-cy="delete-trip-open"]').should('not.exist');
    cy.get('[data-cy="toggle-trip-archive"]').should('not.exist');
  });

  it('shows the number of people on an archived trip', () => {
    cy.intercept('GET', '**/trip/archived', {
      body: [
        {
          ...fixture.trip,
          ownerId: fixture.user.id,
          users: [
            fixture.user.id,
            '64b000000000000000000010',
            '64b000000000000000000011',
          ],
        },
      ],
    });

    visitAsUser('/archived-trips');
    cy.get(`[data-cy="trip-card-container-${fixture.trip._id}"]`).should(
      'contain.text',
      '3 Travelers',
    );
  });

  it('browses itinerary, reservations, and photos without editing controls', () => {
    visitAsUser('/archived-trips');
    cy.get(`[data-cy="trip-card-${fixture.trip._id}"]`)
      .should('have.attr', 'href', `/trip/archived/${fixture.trip._id}`)
      .click();
    cy.get('[data-cy="trip-section-itinerary"]').should(
      'contain.text',
      'Archived Itinerary',
    );
    cy.contains(fixture.event.title).should('be.visible');
    cy.get('[data-cy^="add-event-"]').should('not.exist');
    cy.get('[data-cy="description-edit"]').should('not.exist');
    cy.get('[data-cy^="edit-event-"]').should('not.exist');
    cy.get('[data-cy^="delete-event-"]').should('not.exist');
    cy.get('[data-cy="nav-logistics"]').click();
    cy.contains(fixture.flight.name).should('be.visible');
    cy.contains(fixture.accommodation.name).should('be.visible');
    cy.contains(fixture.rental.name).should('be.visible');
    cy.get('[data-cy^="add-"]').should('not.exist');
    cy.get('[data-cy^="edit-reservation-"]').should('not.exist');
    cy.get('[data-cy^="delete-reservation-"]').should('not.exist');
    cy.get('[data-cy="nav-album"]').click();
    cy.get('[data-cy="album-photo"]').should('be.visible').click();
    cy.get('[data-cy="album-photo-viewer"]').should('be.visible');
    cy.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    cy.get('[data-cy="album-add-photos"]').should('not.exist');
    cy.get('[data-cy="album-edit-photos"]').should('not.exist');
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="trip-visibility"]').should('be.disabled');
    cy.get('[data-cy="share-trip-open"]').should('not.exist');
    cy.get('[data-cy="delete-trip-open"]').should('not.exist');
    cy.get('[data-cy="toggle-trip-archive"]').should(
      'contain.text',
      'Unarchive trip',
    );
  });

  it('keeps map popup event cards read-only', () => {
    cy.intercept('GET', 'https://tiles.openfreemap.org/styles/*', {
      body: fixture.mapStyle,
    });
    cy.intercept(
      { method: 'GET', pathname: '/event/*/location' },
      { body: { location: fixture.location } },
    );
    visitAsUser(`/trip/archived/${fixture.trip._id}`);
    cy.get('[data-cy="expand-itinerary-map"]')
      .should('not.be.disabled')
      .click();
    cy.get(
      `[data-cy="expanded-itinerary-map"] [data-cy="map-pin-${fixture.event._id}"]`,
    ).click();
    cy.get('[data-cy="map-event-popup"]').should(
      'contain.text',
      fixture.event.title,
    );
    cy.get('[data-cy="map-event-popup"] [data-cy^="edit-event-"]').should(
      'not.exist',
    );
    cy.get('[data-cy="map-event-popup"] [data-cy^="delete-event-"]').should(
      'not.exist',
    );
  });

  it('creates and edits a private archived itinerary note', () => {
    cy.intercept(
      { method: 'GET', pathname: `/itinerary/${fixture.trip._id}/notes` },
      { body: 'null', headers: { 'content-type': 'application/json' } },
    ).as('loadPrivateNote');
    cy.intercept(
      { method: 'POST', pathname: `/itinerary/${fixture.trip._id}/notes` },
      (request) => {
        const note = {
          ...noteFixture.owner,
          content: request.body.content,
        };
        request.reply({ statusCode: 201, body: note });
      },
    ).as('createPrivateNote');
    cy.intercept(
      { method: 'PATCH', pathname: `/itinerary/${fixture.trip._id}/notes` },
      (request) => {
        const note = {
          ...noteFixture.owner,
          content: request.body.content,
        };
        request.reply({ body: note });
      },
    ).as('updatePrivateNote');

    visitAsUser(`/trip/archived/${fixture.trip._id}`, 'owner');
    cy.wait('@loadPrivateNote');
    cy.get('[data-cy="archived-note-input"]').type('Owner private note');
    cy.get('[data-cy="archived-note-save"]').click();
    cy.wait('@createPrivateNote')
      .its('request.body.content')
      .should('eq', 'Owner private note');
    cy.get('[data-cy="archived-note-content"]').should(
      'contain.text',
      'Owner private note',
    );

    cy.get('[data-cy="archived-note-edit"]').click();
    cy.get('[data-cy="archived-note-input"]')
      .clear()
      .type('Updated owner private note');
    cy.get('[data-cy="archived-note-save"]').click();
    cy.wait('@updatePrivateNote')
      .its('request.body.content')
      .should('eq', 'Updated owner private note');

    cy.get('[data-cy="archived-note-edit"]').click();
    cy.get('[data-cy="archived-note-input"]').clear();
    cy.get('[data-cy="archived-note-save"]').click();
    cy.wait('@updatePrivateNote').its('request.body.content').should('eq', '');
    cy.get('[data-cy="archived-note-content"]').should(
      'contain.text',
      'No note saved.',
    );
  });

  it('starts a separate private note for a viewer', () => {
    cy.intercept(
      { method: 'GET', pathname: `/itinerary/${fixture.trip._id}/notes` },
      { body: 'null', headers: { 'content-type': 'application/json' } },
    ).as('loadPrivateNote');
    cy.intercept(
      { method: 'POST', pathname: `/itinerary/${fixture.trip._id}/notes` },
      (request) =>
        request.reply({
          statusCode: 201,
          body: { ...noteFixture.viewer, content: request.body.content },
        }),
    ).as('createPrivateNote');

    visitAsUser(`/trip/archived/${fixture.trip._id}`, 'viewer');
    cy.wait('@loadPrivateNote');
    cy.get('[data-cy="archived-note-input"]').should('have.value', '');
    cy.get('[data-cy="archived-note-input"]').type('Viewer private note');
    cy.get('[data-cy="archived-note-save"]').click();
    cy.wait('@createPrivateNote')
      .its('request.body.content')
      .should('eq', 'Viewer private note');
    cy.get('[data-cy="archived-note-content"]').should(
      'contain.text',
      'Viewer private note',
    );
  });

  it('also makes archived trips read-only through the normal trip URL', () => {
    visitAsUser(`/trip/${fixture.trip._id}`);
    cy.get('[data-cy="trip-section-itinerary"]').should(
      'contain.text',
      'Archived Itinerary',
    );
    cy.get('[data-cy^="add-event-"]').should('not.exist');
    cy.get('[data-cy="description-edit"]').should('not.exist');
  });

  it('unarchives a trip and restores the normal editable view', () => {
    let archived = true;
    cy.intercept(
      {
        method: 'GET',
        hostname: 'localhost',
        pathname: `/trip/${fixture.trip._id}`,
      },
      (request) => {
        request.reply({ body: archived ? fixture.trip : fixture.activeTrip });
      },
    );
    cy.intercept('PATCH', '**/trip/archive', (request) => {
      archived = false;
      request.reply({ body: { archived: false } });
    }).as('unarchive');
    visitAsUser(`/trip/archived/${fixture.trip._id}`);
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="toggle-trip-archive"]').click();
    cy.wait('@unarchive')
      .its('request.body.tripId')
      .should('eq', fixture.trip._id);
    cy.location('pathname').should('eq', `/trip/${fixture.trip._id}`);
    cy.get('[data-cy="nav-itinerary"]').click();
    cy.get('[data-cy="description-edit"]').should('be.visible');
    cy.get('[data-cy="add-event-2030-04-01"]').should('be.visible');
  });
});
