/**
 * Displays the practical-planning section for the selected trip.
 * It renders a titled placeholder panel for future travel arrangements.
 *
 * @returns Placeholder trip-logistics content.
 */
function LogisticsView() {
  return (
    <div className="min-h-72 rounded-panel bg-surface-container p-8 text-on-surface">
      <h2 className="text-title">Logistics</h2>
      <p className="mt-2 text-body text-on-surface-variant">
        Reservations, transportation, and packing details will appear here.
      </p>
    </div>
  )
}

export default LogisticsView
