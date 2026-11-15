import { UserRound } from 'lucide-react';
import { useState } from 'react';
import { Text } from '../../../components/common';
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
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const photo = traveler?.profile_picture;
  const hasPhoto = Boolean(photo && photo !== failedPhoto);
  const label = traveler?.username ?? 'Unknown user';

  return (
    <span
      className={`inline-flex h-9 min-w-0 max-w-[min(12rem,100%)] items-center gap-1.5 ${payer ? 'shrink' : 'shrink-0'}`}
      title={label}
    >
      <span
        className={`grid size-6 shrink-0 place-items-center overflow-hidden rounded-full ${payer ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'}`}
      >
        {hasPhoto && (
          <img
            src={photo!}
            alt=""
            className="size-full object-cover"
            onError={() => setFailedPhoto(photo!)}
          />
        )}
        {!hasPhoto && <UserRound aria-hidden size={14} />}
      </span>
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
