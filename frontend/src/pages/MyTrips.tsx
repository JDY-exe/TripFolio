import PageIntro from '../components/PageIntro'

/**
 * Presents the user's trip collection and a placeholder for future trip cards.
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
              className="min-h-48 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
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
