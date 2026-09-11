/**
 * Displays the shared-expense section for the selected trip.
 * It renders a titled placeholder panel for future expenses and balances.
 *
 * @returns Placeholder trip-ledger content.
 */
function LedgerView() {
  return (
    <div className="min-h-72 rounded-panel bg-surface-container p-8 text-on-surface">
      <h2 className="text-title">Ledger</h2>
      <p className="mt-2 text-body text-on-surface-variant">
        Shared expenses and balances will appear here.
      </p>
    </div>
  )
}

export default LedgerView
