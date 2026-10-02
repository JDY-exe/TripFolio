const assert = require('node:assert/strict');
const test = require('node:test');
const { canEditTrip, canReadTrip, getTripRole } = require('../utils/tripAccess');

test('owners and editors can modify trips while viewers are read-only', () => {
  const trip = {
    ownerId: 'owner-id',
    users: ['owner-id', 'editor-id', 'viewer-id'],
    viewerIds: ['viewer-id'],
    isPublic: false,
  };

  assert.equal(getTripRole(trip, 'owner-id'), 'owner');
  assert.equal(getTripRole(trip, 'editor-id'), 'editor');
  assert.equal(getTripRole(trip, 'viewer-id'), 'viewer');
  assert.equal(canEditTrip(trip, 'owner-id'), true);
  assert.equal(canEditTrip(trip, 'editor-id'), true);
  assert.equal(canEditTrip(trip, 'viewer-id'), false);
});

test('private trips are hidden from non-members and public trips are readable', () => {
  assert.equal(canReadTrip({ isPublic: false, users: [] }, 'stranger-id'), false);
  assert.equal(canReadTrip({ isPublic: true, users: [] }, 'stranger-id'), true);
});

test('legacy trip membership keeps its first user as owner', () => {
  const legacyTrip = { users: ['legacy-owner', 'legacy-member'] };

  assert.equal(getTripRole(legacyTrip, 'legacy-owner'), 'owner');
  assert.equal(getTripRole(legacyTrip, 'legacy-member'), 'editor');
});