import fixture from './owned-features.json';
export const originalEvent = {
  ...fixture.event,
  version: 3,
  endTime: '2030-04-01T12:00:00.000Z',
};
export const latestEvent = {
  ...originalEvent,
  version: 4,
  startTime: '2030-04-01T10:00:00.000Z',
};
export const submittedTime = '2030-04-01T11:00:00.000Z';
export const draftNotes = 'Bring an umbrella';
export const conflictResponse = {
  code: 'EDIT_CONFLICT',
  current: latestEvent,
  conflicts: [
    {
      field: 'startTime',
      original: originalEvent.startTime,
      current: latestEvent.startTime,
      submitted: submittedTime,
    },
  ],
};
