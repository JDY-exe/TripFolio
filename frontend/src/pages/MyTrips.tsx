import PageIntro from '../components/PageIntro'

/**
 * Presents the user's trip collection and a placeholder for future trip cards.
 * It pairs the shared page introduction with a responsive grid of trip categories.
 *
 * @returns The trip collection page.
 */
function MyTrips() {
  return (
    <section>
      <PageIntro
        eyebrow="Your journeys"
        title="My trips"
        description="Plan what comes next and revisit every place you have already explored."
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {['Upcoming adventures', 'Past journeys', 'Travel ideas'].map(
          (title) => (
            <article
              key={title}
              className="min-h-48 rounded-panel border border-outline-variant bg-surface-container-low p-6 text-on-surface shadow-sm"
            >
              <h2 className="text-title">{title}</h2>
              <p className="mt-2 text-body text-on-surface-variant">
                Trip details coming soon.
              </p>
            </article>
          ),
        )}
      </div>
    </section>
  )
}

export default MyTrips
