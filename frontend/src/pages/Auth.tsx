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

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-semibold">Authentication form coming soon</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Email, password, and account creation controls will live here.
        </p>
      </div>
    </section>
  )
}

export default Auth
