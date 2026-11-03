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

test('only owners and members can read trips regardless of public visibility', () => {
  assert.equal(canReadTrip({ isPublic: false, users: [] }, 'stranger-id'), false);
  assert.equal(canReadTrip({ isPublic: true, users: [] }, 'stranger-id'), false);
  assert.equal(
    canReadTrip(
      { isPublic: true, ownerId: 'owner-id', users: ['owner-id'] },
      'owner-id',
    ),
    true,
  );
});

test('legacy trip membership keeps its first user as owner', () => {
  const legacyTrip = { users: ['legacy-owner', 'legacy-member'] };

  assert.equal(getTripRole(legacyTrip, 'legacy-owner'), 'owner');
  assert.equal(getTripRole(legacyTrip, 'legacy-member'), 'editor');
});

test('explicit member roles take precedence over legacy trip membership arrays', () => {
  const roleTrip = {
    ownerId: 'owner-id',
    users: ['owner-id', 'editor-id', 'viewer-id'],
    viewerIds: ['editor-id'],
    memberRoles: {
      'editor-id': 'editor',
      'viewer-id': 'viewer'
    }
  };

  assert.equal(getTripRole(roleTrip, 'editor-id'), 'editor');
  assert.equal(getTripRole(roleTrip, 'viewer-id'), 'viewer');
});

test('stale explicit roles do not grant access to users outside the membership list', () => {
  const trip = {
    ownerId: 'owner-id',
    users: ['owner-id', 'member-id'],
    memberRoles: new Map([
      ['member-id', 'viewer'],
      ['removed-member-id', 'editor']
    ])
  };

  assert.equal(getTripRole(trip, 'member-id'), 'viewer');
  assert.equal(canReadTrip(trip, 'removed-member-id'), false);
  assert.equal(canEditTrip(trip, 'removed-member-id'), false);
});

test('owners retain owner role even if a member role is present', () => {
  const trip = {
    ownerId: 'owner-id',
    users: ['owner-id', 'editor-id'],
    memberRoles: { 'owner-id': 'viewer' }
  };

  assert.equal(getTripRole(trip, 'owner-id'), 'owner');
});

test('a persisted owner role cannot promote a non-owner member', () => {
  const trip = {
    ownerId: 'owner-id',
    users: ['owner-id', 'member-id'],
    memberRoles: { 'member-id': 'owner' },
  };

  assert.equal(getTripRole(trip, 'member-id'), 'editor');
});