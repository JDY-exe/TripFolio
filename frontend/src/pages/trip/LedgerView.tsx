/**
 * Displays the shared-expense section for the selected trip.
 *
 * @returns Placeholder trip-ledger content.
 */
function LedgerView() {
  return (
    <div className="min-h-72 rounded-3xl bg-surface-container p-8">
      <h2 className="text-xl font-semibold">Ledger</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        Shared expenses and balances will appear here.
      </p>
    </div>
  )
}

export default LedgerView
