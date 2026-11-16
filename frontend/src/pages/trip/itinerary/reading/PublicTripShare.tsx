import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button, displayAlert } from '../../../../components/common';

/** Copies the current public trip URL and reports the clipboard result.
 * @returns A share button with pending state and success or error toast feedback.
 */
const PublicTripShare = () => {
  const [isCopying, setIsCopying] = useState(false);

  /** Copies the exact current URL, including its query and fragment.
   * @returns A promise that settles after clipboard access and toast feedback.
   */
  const copyLink = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(window.location.href);
      displayAlert({ message: 'Trip link copied.', tone: 'success' });
    } catch {
      displayAlert({
        message: 'Could not copy the trip link. Please try again.',
        tone: 'error',
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Button
      data-cy="share-public-trip"
      leadingIcon={<Share2 aria-hidden size={18} />}
      disabled={isCopying}
      onClick={() => void copyLink()}
      className="shrink-0"
    >
      Share trip
    </Button>
  );
};

export default PublicTripShare;
