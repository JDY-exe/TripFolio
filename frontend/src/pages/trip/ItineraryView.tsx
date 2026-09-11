/**
 * Displays the itinerary section for the selected trip.
 * It renders a titled placeholder panel for future daily plans.
 *
 * @returns Placeholder itinerary content.
 */
function ItineraryView() {
  return (
    <div className="min-h-72 rounded-panel bg-surface-container p-8 text-on-surface">
      <h2 className="text-title">Itinerary</h2>
      <p className="mt-2 text-body text-on-surface-variant">
        Daily plans will appear here.
      </p>
    </div>
  )
}

export default ItineraryView
