import featureFixture from '../fixtures/owned-features.json';
import { visitAsUser } from '../support/auth';

describe('Profile', () => {
  it('shows account details and sends a friend request from search', () => {
    let outgoingRequests: object[] = [];
    cy.intercept({ method: 'GET', pathname: '/users/friends' }, (request) => {
      request.reply({
        body: { friends: [], incomingRequests: [], outgoingRequests },
      });
    });
    cy.intercept(
      { method: 'GET', pathname: '/users/search' },
      {
        body: { users: [featureFixture.friend] },
      },
    ).as('search');
    cy.intercept(
      { method: 'POST', pathname: '/users/friends/request' },
      (request) => {
        outgoingRequests = [featureFixture.incomingRequest];
        request.reply({
          body: {
            message: 'Friend request sent.',
            request: {
              id: featureFixture.incomingRequest.id,
              status: 'pending',
              createdAt: featureFixture.incomingRequest.createdAt,
            },
          },
        });
      },
    ).as('requestFriend');

    visitAsUser('/profile');
    cy.get('[data-cy="profile-username"]').should(
      'have.text',
      featureFixture.user.username,
    );
    cy.contains(featureFixture.user.email).should('be.visible');
    cy.get('[data-cy="friend-search"]').type('trav');
    cy.get('@search.all').should((calls) => {
      expect(
        calls.some(
          (call: { request: { query: { username?: string } } }) =>
            call.request.query.username === 'trav',
        ),
      ).to.equal(true);
    });
    cy.get(`[data-cy="add-friend-${featureFixture.friend.id}"]`).click();
    cy.wait('@requestFriend')
      .its('request.body.targetUserId')
      .should('eq', featureFixture.friend.id);
    cy.contains('Request sent').should('be.visible');
  });

  it('accepts an incoming friend request', () => {
    let accepted = false;
    cy.intercept({ method: 'GET', pathname: '/users/friends' }, (request) => {
      request.reply({
        body: {
          friends: accepted ? [featureFixture.friend] : [],
          incomingRequests: accepted ? [] : [featureFixture.incomingRequest],
          outgoingRequests: [],
        },
      });
    });
    cy.intercept(
      { method: 'PATCH', pathname: '/users/friends/accept' },
      (request) => {
        accepted = true;
        request.reply({
          body: {
            message: 'Friend request accepted.',
            friendship: {
              id: featureFixture.incomingRequest.id,
              status: 'accepted',
            },
          },
        });
      },
    ).as('acceptFriend');
    visitAsUser('/profile');
    cy.get(
      `[data-cy="accept-friend-${featureFixture.incomingRequest.id}"]`,
    ).click();
    cy.wait('@acceptFriend')
      .its('request.body.requestId')
      .should('eq', featureFixture.incomingRequest.id);
    cy.get('[data-cy="friends-list"]').should(
      'contain.text',
      featureFixture.friend.username,
    );
  });

  it('crops and saves a profile picture', () => {
    cy.intercept(
      { method: 'GET', pathname: '/users/friends' },
      {
        body: { friends: [], incomingRequests: [], outgoingRequests: [] },
      },
    );
    cy.intercept(
      { method: 'PATCH', pathname: '/users/profile_picture' },
      {
        body: { user: featureFixture.user },
      },
    ).as('savePicture');
    visitAsUser('/profile');
    cy.get('[data-cy="profile-picture-open"]').click();
    cy.get('[data-cy="profile-picture-file-input"]').selectFile(
      'cypress/fixtures/avatar.png',
      { force: true },
    );
    cy.get('[data-cy="profile-picture-crop-accept"]')
      .should('be.enabled')
      .click();
    cy.wait('@savePicture')
      .its('request.body.profile_picture')
      .should('match', /^data:image\/jpeg;base64,/);
    cy.get('[data-cy="toast"]')
      .contains('Profile picture updated.')
      .should('exist');
  });
});
