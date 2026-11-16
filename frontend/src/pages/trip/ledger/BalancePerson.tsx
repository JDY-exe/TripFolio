import { Avatar, Text } from '../../../components/common';
import type { TripTraveler } from '../../../queries/trips';

interface BalancePersonProps {
  userId: string;
  travelers: TripTraveler[];
  currentUserId?: string;
}

/** Resolves a balance participant to an avatar and a wrapping, accessible name.
 * @param props - Participant ID, trip directory, and optional signed-in user.
 * @returns An inline person, with a safe fallback for former or unavailable members.
 */
const BalancePerson = ({
  userId,
  travelers,
  currentUserId,
}: BalancePersonProps) => {
  const traveler = travelers.find((member) => member.id === userId);
  const name =
    userId === currentUserId ? 'You' : traveler?.username || 'Unknown user';
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar imageUrl={traveler?.profile_picture} />
      <Text
        as="span"
        variant="label"
        className="min-w-0 font-normal [overflow-wrap:anywhere]"
      >
        {name}
      </Text>
    </span>
  );
};

export default BalancePerson;
