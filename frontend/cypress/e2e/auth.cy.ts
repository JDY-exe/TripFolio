import featureFixture from '../fixtures/owned-features.json';
import { testAccessToken, visitAsUser } from '../support/auth';

describe('account access', () => {
  it('sends an unauthenticated visitor to login and resumes the requested page', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    cy.intercept(
      { method: 'POST', pathname: '/users/login' },
      {
        body: { token: testAccessToken(), user: featureFixture.user },
      },
    ).as('login');

    cy.visit('/my-trips');
    cy.location('pathname').should('eq', '/auth');
    cy.get('[data-cy="login-email"]').type(featureFixture.user.email);
    cy.get('[data-cy="login-password"]').type('sample-password');
    cy.get('[data-cy="login-submit"]').click();

    cy.wait('@login')
      .its('request.body.email')
      .should('eq', featureFixture.user.email);
    cy.location('pathname').should('eq', '/my-trips');
    cy.get('[data-cy="my-trips-title"]').should(
      'contain.text',
      'My Upcoming Trips',
    );
  });

  it('keeps the login form available after rejected credentials', () => {
    cy.intercept(
      { method: 'POST', pathname: '/users/login' },
      {
        statusCode: 401,
        body: { message: 'Invalid credentials' },
      },
    ).as('login');
    cy.visit('/auth');
    cy.get('[data-cy="login-email"]').type(featureFixture.user.email);
    cy.get('[data-cy="login-password"]').type('wrong-password');
    cy.get('[data-cy="login-submit"]').click();

    cy.wait('@login');
    cy.location('pathname').should('eq', '/auth');
    cy.get('[data-cy="toast"]').contains('Unable to log in').should('exist');
  });

  it('validates signup and lets a newly registered user skip the picture', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    cy.intercept(
      { method: 'POST', pathname: '/users/register' },
      {
        body: { token: testAccessToken(), user: featureFixture.user },
      },
    ).as('register');
    cy.visit('/auth');
    cy.get('[data-cy="auth-signup-mode"]').check({ force: true });
    cy.get('[data-cy="signup-name"]').type(featureFixture.user.username);
    cy.get('[data-cy="signup-email"]').type(featureFixture.user.email);
    cy.get('[data-cy="signup-password"]').type('sample-password');
    cy.get('[data-cy="signup-password-again"]').type('different-password');
    cy.get('[data-cy="signup-submit"]').click();
    cy.get('[data-cy="toast"]')
      .contains('Passwords do not match')
      .should('exist');
    cy.get('[data-cy="signup-password-again"]').clear().type('sample-password');
    cy.get('[data-cy="signup-submit"]').click();

    cy.wait('@register')
      .its('request.body.username')
      .should('eq', featureFixture.user.username);
    cy.get('[data-cy="onboard-title"]').should('contain.text', 'Add a');
    cy.get('[data-cy="onboard-skip"]').click();
    cy.location('pathname').should('eq', '/my-trips');
  });

  it('clears the session on logout', () => {
    cy.intercept(
      { method: 'GET', pathname: '/users/friends' },
      {
        body: { friends: [], incomingRequests: [], outgoingRequests: [] },
      },
    );
    visitAsUser('/profile');
    cy.get('[data-cy="profile-title"]').should('contain.text', 'My Profile');
    cy.get('[data-cy="logout"]').click();
    cy.location('pathname').should('eq', '/auth');
    cy.window().then((window) => {
      expect(window.localStorage.getItem('tripfolio.auth.v1')).to.equal(null);
    });
  });
});
