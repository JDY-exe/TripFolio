import { Share2 } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Modal,
  TextField,
  displayAlert,
} from '../../../../components/common';

interface PublicTripShareProps {
  tripId: string;
  title: string;
}

/** Shares a public itinerary without changing membership or visibility.
 * @param props - Public trip identifier and the title shown in native sharing.
 * @returns A share button with native sharing, clipboard, and manual-copy fallbacks.
 */
const PublicTripShare = ({ tripId, title }: PublicTripShareProps) => {
  const [showLink, setShowLink] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const url = new URL(
    `/public-itinerary/${encodeURIComponent(tripId)}`,
    window.location.origin,
  ).href;

  /** Opens native sharing or copies the public URL, retaining a selectable link on failure.
   * @returns A promise that settles after handoff, cancellation, or fallback display.
   */
  const share = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, url });
          return;
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            error.name === 'AbortError'
          )
            return;
        }
      }
      await navigator.clipboard.writeText(url);
      displayAlert({ message: 'Trip link copied.', tone: 'success' });
    } catch {
      setShowLink(true);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <Button
        data-cy="share-public-trip"
        leadingIcon={<Share2 aria-hidden size={18} />}
        disabled={isSharing}
        onClick={() => void share()}
        className="shrink-0"
      >
        Share trip
      </Button>
      <Modal
        open={showLink}
        onClose={() => setShowLink(false)}
        title="Share trip"
        description="Copy this link to share the public itinerary."
        footer={<Button onClick={() => setShowLink(false)}>Done</Button>}
      >
        <TextField
          id="public-trip-link"
          data-cy="public-trip-link"
          label="Trip link"
          value={url}
          readOnly
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
        />
      </Modal>
    </>
  );
};

export default PublicTripShare;
