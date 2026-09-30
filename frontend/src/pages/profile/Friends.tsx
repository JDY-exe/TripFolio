import { Text } from '../../components/common';

/**
 * Reserves the profile's friends area until account relationships are backed by
 * application data.
 *
 * @returns The friends section and its temporary implementation note.
 */
function Friends() {
  return (
    <section aria-labelledby="friends-heading">
      <Text as="h2" id="friends-heading" variant="headline">
        Friends
      </Text>
      <Text className="mt-4" color="muted">
        TODO: Add friends here.
      </Text>
    </section>
  );
}

export default Friends;
