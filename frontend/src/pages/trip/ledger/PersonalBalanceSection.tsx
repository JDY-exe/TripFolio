import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useId } from 'react';
import { Text } from '../../../components/common';
import type { LedgerBalance } from '../../../queries/ledger';
import type { TripTraveler } from '../../../queries/trips';
import BalancePerson from './BalancePerson';
import { ledgerCurrency } from './ledgerCurrency';

interface PersonalBalanceSectionProps {
  direction: 'send' | 'receive';
  balances: LedgerBalance[];
  travelers: TripTraveler[];
}

/** Lists only counterparties for one direction of the signed-in user's payments.
 * @param props - Direction, already-filtered balances, and member directory.
 * @returns A labeled list when payments exist, otherwise nothing.
 */
const PersonalBalanceSection = ({
  direction,
  balances,
  travelers,
}: PersonalBalanceSectionProps) => {
  const headingId = useId();
  if (balances.length === 0) return null;
  const sending = direction === 'send';
  const DirectionIcon = sending ? ArrowUpRight : ArrowDownLeft;
  return (
    <section aria-labelledby={headingId} data-cy={`balances-${direction}`}>
      <Text
        as="h4"
        id={headingId}
        variant="label"
        color="muted"
        className="mb-2 flex items-center gap-2"
      >
        <DirectionIcon aria-hidden size={16} />
        {sending ? 'You’ll send' : 'You’ll receive'}
      </Text>
      {balances.length > 0 && (
        <ul className="space-y-1">
          {balances.map((balance) => (
            <li
              key={`${balance.owerId}-${balance.oweeId}`}
              className="flex items-center justify-between gap-4 py-2"
              data-cy="personal-balance-row"
            >
              <BalancePerson
                userId={sending ? balance.oweeId : balance.owerId}
                travelers={travelers}
              />
              <Text
                variant="label"
                className="shrink-0 whitespace-nowrap tabular-nums"
              >
                {ledgerCurrency.format(balance.amount)}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default PersonalBalanceSection;
