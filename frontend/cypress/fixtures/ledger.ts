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

export const cardTravelers = [
  ...travelers,
  {
    id: '64b000000000000000000021',
    username: 'avery_with_a_very_long_username',
  },
  { id: '64b000000000000000000022', username: 'Riley' },
  { id: '64b000000000000000000023', username: 'Casey' },
  { id: '64b000000000000000000024', username: 'Robin' },
];

export const cardExpenses = [
  { ...expense, splitAmong: [travelers[1].id] },
  {
    ...expense,
    _id: '64b000000000000000000025',
    description: 'Groceries for the house',
    amount: 246.8,
    paidBy: cardTravelers[6].id,
    splitAmong: cardTravelers.map((traveler) => traveler.id),
  },
];

export const pickerTravelers = cardTravelers.map((traveler, index) => ({
  ...traveler,
  profile_picture:
    index === 1
      ? '/test-avatar.png'
      : index === 2
        ? '/broken-avatar.png'
        : null,
}));

export const editedExpense = {
  ...cardExpenses[0],
  amount: 128,
  splitAmong: [travelers[1].id, cardTravelers[9].id],
};
