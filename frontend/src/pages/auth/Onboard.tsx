import { ArrowRight, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Button, MediaUpload, Text } from '../../components/common';

export interface OnboardProps {
  /** Completes onboarding and reports whether the default picture was chosen. */
  onComplete: (useDefaultPicture: boolean) => void;
}

/**
 * Prompts a newly registered user to choose a profile picture. It tracks only
 * the selected filename and lets the parent finish with that choice or the
 * application's default profile picture.
 *
 * @param props - Callback used to finish the temporary onboarding flow.
 * @returns The profile-picture onboarding step.
 */
function Onboard({ onComplete }: OnboardProps) {
  const [selectedFilename, setSelectedFilename] = useState<string>();

  /**
   * Records the first selected image name without retaining its file contents.
   *
   * @param fileNames - Names reported by the shared media picker.
   * @returns Nothing; local selection state is updated.
   */
  const handlePictureSelected = (fileNames: readonly string[]) => {
    setSelectedFilename(fileNames[0]);
  };

  return (
    <section
      aria-labelledby="onboard-heading"
      className="mx-auto max-w-xl py-4 text-on-surface sm:py-8"
    >
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-secondary-container text-on-secondary-container"
        >
          <UserRound size={34} strokeWidth={1.5} />
        </div>
        <Text as="h1" id="onboard-heading" variant="headline">
          Add a profile picture
        </Text>
      </div>

      <MediaUpload
        className="mt-8"
        height={320}
        label="Choose a profile picture"
        mediaType="image"
        name="profile-picture"
        onFilesSelected={handlePictureSelected}
      />

      <div aria-live="polite" className="mt-4 min-h-6 text-center">
        {selectedFilename ? (
          <Text color="muted">Selected: {selectedFilename}</Text>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
        <Button
          className="flex-1"
          leadingIcon={<UserRound aria-hidden size={18} />}
          onClick={() => onComplete(true)}
          size="lg"
          variant="secondary"
        >
          Skip
        </Button>
        <Button
          className="flex-1"
          disabled={!selectedFilename}
          onClick={() => onComplete(false)}
          size="lg"
          trailingIcon={<ArrowRight aria-hidden size={18} />}
        >
          Continue
        </Button>
      </div>
    </section>
  );
}

export default Onboard;
