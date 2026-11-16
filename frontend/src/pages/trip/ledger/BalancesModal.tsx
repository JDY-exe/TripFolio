import { Button, Modal, Text } from '../../../components/common';
import type { LedgerBalance } from '../../../queries/ledger';
import type { TripTraveler } from '../../../queries/trips';
import BalancePerson from './BalancePerson';
import { ledgerCurrency } from './ledgerCurrency';

interface BalancesModalProps {
  open: boolean;
  onClose: () => void;
  balances: LedgerBalance[];
  travelers: TripTraveler[];
  currentUserId?: string;
}

/** Presents every payment in a bounded dialog with persistent headings and dismissal.
 * @param props - Controlled visibility, live balances, and participant directory.
 * @returns A shared modal whose table scrolls independently on short or narrow screens.
 */
const BalancesModal = ({
  open,
  onClose,
  balances,
  travelers,
  currentUserId,
}: BalancesModalProps) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Everyone's balances"
    showCloseButton
    data-cy="balances-dialog"
    panelClassName="max-w-3xl max-h-[calc(100dvh-2rem)] flex flex-col sm:max-h-[calc(100dvh-4rem)]"
    contentClassName="flex min-h-0 flex-col"
    footer={(requestClose) => (
      <Button onClick={requestClose} data-cy="balances-done">
        Done
      </Button>
    )}
  >
    <div
      role="region"
      aria-label="Everyone’s outstanding payments"
      tabIndex={0}
      data-cy="balances-scroll"
      className="min-h-0 overflow-y-auto overscroll-contain pr-3 [scrollbar-gutter:stable] [scrollbar-color:var(--color-outline-variant)_var(--color-surface-container)] [scrollbar-width:thin]"
    >
      {balances.length === 0 && (
        <Text color="muted" className="py-4">
          All balances are settled.
        </Text>
      )}
      {balances.length > 0 && (
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-left"
          data-cy="balances-table"
        >
          <caption className="sr-only">
            Outstanding payments between all trip travelers
          </caption>
          <thead className="sticky top-0 z-10 bg-surface-container">
            <tr>
              {['From', 'To', 'Amount'].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className={`border-b border-outline-variant pb-3 pt-1 ${heading === 'Amount' ? 'w-24 text-right sm:w-28' : 'pr-3'}`}
                >
                  <Text as="span" variant="caption" color="muted">
                    {heading}
                  </Text>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr
                key={`${balance.owerId}-${balance.oweeId}`}
                data-cy="group-balance-row"
              >
                <td className="border-b border-outline-variant py-4 pr-3 align-middle">
                  <BalancePerson
                    userId={balance.owerId}
                    travelers={travelers}
                    currentUserId={currentUserId}
                  />
                </td>
                <td className="border-b border-outline-variant py-4 pr-3 align-middle">
                  <BalancePerson
                    userId={balance.oweeId}
                    travelers={travelers}
                    currentUserId={currentUserId}
                  />
                </td>
                <td className="border-b border-outline-variant py-4 text-right align-middle">
                  <Text
                    variant="label"
                    className="whitespace-nowrap font-normal tabular-nums"
                  >
                    {ledgerCurrency.format(balance.amount)}
                  </Text>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </Modal>
);

export default BalancesModal;
