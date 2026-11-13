import fixture from './owned-features.json';

export const travelers = [
  { id: fixture.user.id, username: 'owner' },
  { id: '64b000000000000000000011', username: 'Maya' },
  { id: '64b000000000000000000012', username: 'Sam' },
  { id: '64b000000000000000000013', username: 'Jordan' },
  { id: '64b000000000000000000014', username: 'Priya' },
  { id: '64b000000000000000000015', username: 'Leo' },
];

export const ledgerTrip = { ...fixture.trip, travelers, budget: 500 };
export const ledgerTripDetails = { ...fixture.trip, budget: 500 };
export const expenseDraft = {
  description: 'Dinner at Luigi’s',
  amount: '96.00',
};
export const expense = {
  _id: '64b000000000000000000016',
  tripId: ledgerTrip._id,
  description: expenseDraft.description,
  amount: 96,
  paidBy: travelers[0].id,
  splitAmong: travelers.map((traveler) => traveler.id),
};
export const balances = [
  { owerId: travelers[1].id, oweeId: travelers[0].id, amount: 16 },
];
export const saveFailure = {
  message: 'Could not add the expense. Please try again.',
};
