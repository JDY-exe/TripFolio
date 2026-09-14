/**
 * Displays the shared-expense section for the selected trip.
 * It renders a titled placeholder panel for future expenses and balances.
 *
 * @returns Placeholder trip-ledger content.
 */
function LedgerView() {
  return (
    <div className="min-h-72 rounded-panel bg-surface-container p-8 text-on-surface">
      <Text as="h2" variant="title">
        Ledger
      </Text>
      <Text color="muted" className="mt-2">
        Shared expenses and balances will appear here.
      </Text>
    </div>
  );
}

export default LedgerView;
import { Text } from '../../components/common';
