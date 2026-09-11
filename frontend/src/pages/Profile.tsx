import PageIntro from '../components/PageIntro'

/**
 * Presents placeholder account details and preferences for the signed-in user.
 * It pairs the shared page introduction with a settings preview panel.
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

      <div className="mt-10 rounded-panel border border-dashed border-outline bg-surface-container-low p-8 text-on-surface">
        <p className="text-title">Profile settings coming soon</p>
        <p className="mt-2 text-body text-on-surface-variant">
          Your photo, display name, home base, and travel preferences will
          appear here.
        </p>
      </div>
    </section>
  )
}

export default Profile
