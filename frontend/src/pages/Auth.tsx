import PageIntro from '../components/PageIntro'

/**
 * Presents the authentication route's placeholder sign-in experience.
 *
 * It combines the shared page introduction with a basic form-shaped preview
 * that can later be connected to the application's authentication service.
 *
 * @returns The authentication page.
 */
function Auth() {
  return (
    <section className="grid gap-10 lg:grid-cols-2 lg:items-start">
      <PageIntro
        eyebrow="Welcome back"
        title="Sign in to TripFolio"
        description="Keep your travel plans, memories, and favorite places together in one account."
      />

      <div className="rounded-panel border border-outline-variant bg-surface-container-low p-8 text-on-surface shadow-sm">
        <p className="text-title">Authentication form coming soon</p>
        <p className="mt-2 text-body text-on-surface-variant">
          Email, password, and account creation controls will live here.
        </p>
      </div>
    </section>
  )
}

export default Auth
