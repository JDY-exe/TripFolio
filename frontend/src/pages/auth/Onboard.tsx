import { ArrowRight, UserRound } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  imageFileToDataUrl,
  ImageUploadField,
  profileImagePreset,
  type ImageCropStatus,
  Text,
} from '../../components/common';

export interface OnboardProps {
  /** Saves an optional prepared picture and completes onboarding. */
  onComplete: (picture?: string) => Promise<void>;
}

/**
 * Prompts a newly registered user to choose a profile picture. Selected images
 * use the shared centered-crop pipeline before preview and account persistence.
 *
 * @param props - Callback used to finish the temporary onboarding flow.
 * @returns The profile-picture onboarding step.
 */
const Onboard = ({ onComplete }: OnboardProps) => {
  const [picture, setPicture] = useState<File>();
  const [cropStatus, setCropStatus] = useState<ImageCropStatus>({
    active: false,
    processing: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  /**
   * Completes onboarding with the selected picture or the default avatar.
   *
   * @param selectedPicture - Processed image file, or undefined when skipping.
   * @returns A promise resolving after the parent completes onboarding.
   */
  const finishOnboarding = async (selectedPicture?: File) => {
    if (isSaving || cropStatus.active) return;

    setIsSaving(true);
    setError(undefined);
    try {
      await onComplete(
        selectedPicture ? await imageFileToDataUrl(selectedPicture) : undefined,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to save your profile picture.',
      );
      setIsSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="onboard-heading"
      className="mx-auto max-w-xl py-4 text-on-surface sm:py-8"
    >
      <div className="mt-20 text-center">
        <Text as="h1" id="onboard-heading" variant="headline">
          Add a <span className="text-primary">profile picture?</span>
        </Text>
      </div>

      <ImageUploadField
        className="mt-8"
        disabled={isSaving}
        label="Choose a profile picture"
        name="profile-picture"
        onAccept={setPicture}
        onCropStatusChange={setCropStatus}
        pickerHeight={384}
        preset={profileImagePreset}
        previewAlt="Selected profile picture preview"
        replaceLabel="Choose another picture"
        value={picture}
      />

      <div aria-live="polite" className="mt-4 min-h-6 text-center">
        {error ? (
          <Text color="error" role="alert">
            {error}
          </Text>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
        <Button
          className="flex-1"
          disabled={isSaving || cropStatus.active}
          leadingIcon={<UserRound aria-hidden size={18} />}
          onClick={() => void finishOnboarding()}
          size="lg"
          variant="secondary"
        >
          Skip
        </Button>
        <Button
          className="flex-1"
          disabled={isSaving || cropStatus.active || !picture}
          onClick={() => void finishOnboarding(picture)}
          size="lg"
          trailingIcon={<ArrowRight aria-hidden size={18} />}
        >
          Continue
        </Button>
      </div>
    </section>
  );
};

export default Onboard;
