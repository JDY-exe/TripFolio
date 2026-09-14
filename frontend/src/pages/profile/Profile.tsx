import PageIntro from '../../components/PageIntro'
import { Text } from '../../components/common'

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
        <Text variant="title">Profile settings coming soon</Text>
        <Text color="muted" className="mt-2">
          Your photo, display name, home base, and travel preferences will
          appear here.
        </Text>
      </div>
    </section>
  )
}

export default Profile
