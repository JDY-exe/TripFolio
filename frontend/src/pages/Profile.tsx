import PageIntro from '../components/PageIntro'

/**
 * Presents placeholder account details and preferences for the signed-in user.
 *
 * @returns The profile page.
 */
function Profile() {
  return (
    <section>
      <PageIntro
        eyebrow="Your account"
        title="Profile"
        description="Manage the details other travelers see and personalize your TripFolio experience."
      />

      <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-8">
        <p className="font-semibold">Profile settings coming soon</p>
        <p className="mt-2 text-sm text-slate-600">
          Your photo, display name, home base, and travel preferences will
          appear here.
        </p>
      </div>
    </section>
  )
}

export default Profile
