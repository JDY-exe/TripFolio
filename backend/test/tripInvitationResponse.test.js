const test = require('node:test');
const assert = require('node:assert/strict');
const Trip = require('../models/trip');
const Invitation = require('../models/TripInvitation');
const { respondToTripInvitation } = require('../controllers/tripController');

test('invitation responses require a pending invitation owned by the recipient and add membership only on accept', async () => {
  const originalFind = Invitation.findOne;
  const originalUpdate = Trip.findByIdAndUpdate;
  const updates = [];
  let pending = true;
  const invitation = { trip: 'trip-id', save: async () => {} };
  Invitation.findOne = async (filter) => {
    assert.equal(filter.recipient, 'recipient');
    assert.equal(filter.status, 'pending');
    return pending ? invitation : null;
  };
  Trip.findByIdAndUpdate = async (...args) => { updates.push(args); return {}; };
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  const request = (status) => ({ user: { id: 'recipient' }, params: { invitationId: '507f1f77bcf86cd799439011' }, body: { status } });
  try {
    await respondToTripInvitation(request('accepted'), res);
    assert.equal(res.code, 200);
    assert.deepEqual(updates[0][1], { $addToSet: { users: 'recipient' } });
    assert.equal(invitation.status, 'accepted');
    await respondToTripInvitation(request('declined'), res);
    assert.equal(invitation.status, 'declined');
    assert.equal(updates.length, 1);
    pending = false;
    await respondToTripInvitation(request('accepted'), res);
    assert.equal(res.code, 404);
    await respondToTripInvitation(request('pending'), res);
    assert.equal(res.code, 400);
  } finally {
    Invitation.findOne = originalFind;
    Trip.findByIdAndUpdate = originalUpdate;
  }
});
