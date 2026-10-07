import tripFixture from '../fixtures/trip-visibility.json';

type TripRole = 'owner' | 'viewer';

/** @returns A future-dated token accepted by the frontend session reader. */
export const testAccessToken = () =>
  `header.${btoa(JSON.stringify({ exp: 4102444800 }))}.signature`;

/**
 * Opens a protected route with a valid stored session and a mocked account.
 * @param path - Route to open in the browser.
 * @param role - Account role used to choose the fixture identity.
 * @returns Nothing; Cypress queues the intercepted request and visit.
 */
export const visitAsUser = (path: string, role: TripRole = 'owner') => {
  const user = {
    id: role === 'owner' ? tripFixture.ownerId : tripFixture.viewerId,
    username: role,
    email: `${role}@tripfolio.test`,
    friends: [],
  };
  const token = testAccessToken();

  cy.intercept({ method: 'GET', pathname: '/users/me' }, { body: { user } });
  cy.visit(path, {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'tripfolio.auth.v1',
        JSON.stringify({ token, user }),
      );
    },
  });
};
