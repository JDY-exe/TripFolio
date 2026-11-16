import { Maximize2 } from 'lucide-react';
import { useId } from 'react';
import { Button, Text } from '../../../components/common';
import type { LedgerBalance } from '../../../queries/ledger';
import type { TripTraveler } from '../../../queries/trips';
import PersonalBalanceSection from './PersonalBalanceSection';

interface SummaryTableProps {
  balances: LedgerBalance[];
  travelers: TripTraveler[];
  currentUserId?: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onExpand: () => void;
}

/** Keeps the sidebar personal while exposing all travelers' payments in a dialog.
 * @param props - Cached balances, current identity, member directory, and query status.
 * @returns Separate send/receive lists, or a mutually exclusive loading/error state.
 */
const SummaryTable = ({
  balances,
  travelers,
  currentUserId,
  loading,
  error,
  onRetry,
  onExpand,
}: SummaryTableProps) => {
  const headingId = useId();
  const sending = balances.filter(
    (balance) => balance.owerId === currentUserId,
  );
  const receiving = balances.filter(
    (balance) => balance.oweeId === currentUserId,
  );
  return (
    <>
      <section
        aria-labelledby={headingId}
        className="rounded-panel bg-surface-container p-6 text-on-surface"
        data-cy="personal-balances"
      >
        <Text as="h3" id={headingId} variant="title">
          Your balances
        </Text>
        {loading && (
          <Text color="muted" className="mt-5" role="status">
            Loading balances...
          </Text>
        )}
        {!loading && error && (
          <div className="mt-5 space-y-3">
            <Text role="alert" color="error">
              Could not load balances.
            </Text>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              data-cy="balances-retry"
            >
              Retry
            </Button>
          </div>
        )}
        {!loading && !error && (
          <>
            {(sending.length > 0 || receiving.length > 0) && (
              <div
                className="mt-6 max-h-86 space-y-6 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable] [scrollbar-color:var(--color-outline-variant)_var(--color-surface-container)] [scrollbar-width:thin]"
                data-cy="personal-balances-list"
                tabIndex={0}
                aria-label="Your outstanding payments"
              >
                <PersonalBalanceSection
                  direction="send"
                  balances={sending}
                  travelers={travelers}
                />
                <PersonalBalanceSection
                  direction="receive"
                  balances={receiving}
                  travelers={travelers}
                />
              </div>
            )}
            <div className="mt-5">
              <Button
                variant="secondary"
                fullWidth
                trailingIcon={<Maximize2 aria-hidden size={16} />}
                onClick={onExpand}
                aria-haspopup="dialog"
                data-cy="expand-balances"
              >
                Everyone’s balances
              </Button>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default SummaryTable;
