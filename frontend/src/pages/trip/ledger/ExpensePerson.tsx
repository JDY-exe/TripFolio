import { Avatar, Text } from '../../../components/common';
import type { TripTraveler } from '../../../queries/trips';

interface ExpensePersonProps {
  traveler?: TripTraveler;
  payer?: boolean;
}

/** Displays a trip member consistently in payer, preview, and expanded recipient rows.
 * @param props - Resolved traveler and optional payer emphasis; missing or failed photos use an icon.
 * @returns An inline avatar and username, with the full username available when truncated.
 */
const ExpensePerson = ({ traveler, payer = false }: ExpensePersonProps) => {
  const label = traveler?.username ?? 'Unknown user';

  return (
    <span
      className={`inline-flex h-9 min-w-0 max-w-[min(12rem,100%)] items-center gap-1.5 ${payer ? 'shrink' : 'shrink-0'}`}
      title={label}
    >
      <Avatar
        imageUrl={traveler?.profile_picture}
        tone={payer ? 'secondary' : 'default'}
      />
      <Text
        as="span"
        variant="label"
        className={`min-w-0 truncate ${payer ? 'font-medium' : 'font-normal'}`}
      >
        {label}
      </Text>
    </span>
  );
};

export default ExpensePerson;
