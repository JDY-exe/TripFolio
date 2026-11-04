import { ArrowLeft } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { IconButton, Modal } from '../../../../components/common';
import { useAuth } from '../../../../contexts/AuthContext';
import type { RecapKind } from './dailyRecap';
import HighlightChooser from './HighlightChooser';
import { RECAP_FORMATS } from './highlights';
import RecapBrowser from './RecapBrowser';

interface HighlightsModalProps {
  tripId: string;
  open: boolean;
  onClose: () => void;
}

/** Keeps format navigation in one focus-managed dialog without retaining private exports.
 * @param props - Trip/account scope, visibility and dismiss action.
 * @returns Compact format choices or the shared preview browser, with in-dialog back navigation.
 */
const HighlightsDialog = ({
  tripId,
  userId,
  open,
  onClose,
}: HighlightsModalProps & { userId: string }) => {
  const [kind, setKind] = useState<RecapKind>();
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef<RecapKind>(undefined);
  const title = kind
    ? RECAP_FORMATS.find((format) => format.kind === kind)!.title
    : 'Share highlights';
  useLayoutEffect(() => {
    if (kind) root.current?.focus();
    else if (previous.current)
      root.current
        ?.querySelector<HTMLButtonElement>(
          `[data-cy="highlight-${previous.current}"]`,
        )
        ?.focus();
    previous.current = kind;
  }, [kind]);
  return (
    <Modal
      open={open}
      title={
        <span className="flex min-w-0 items-center gap-2">
          {kind && (
            <IconButton
              label="Choose another recap"
              icon={<ArrowLeft size={20} />}
              onClick={() => setKind(undefined)}
              data-cy="highlight-back"
            />
          )}
          <span className="min-w-0">{title}</span>
        </span>
      }
      onClose={onClose}
      onExited={() => setKind(undefined)}
      showCloseButton
      panelClassName="max-w-xl"
      contentClassName="max-h-[85dvh] overflow-y-auto"
    >
      {open && (
        <div
          ref={root}
          tabIndex={-1}
          className="outline-none"
          aria-label={kind ? title : 'Choose a highlight format'}
        >
          {!kind && <HighlightChooser onChoose={setKind} />}
          {kind && (
            <RecapBrowser
              key={kind}
              kind={kind}
              tripId={tripId}
              userId={userId}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

/** Resets selection and generated content whenever the private account or trip changes.
 * @param props - Album identifier, dialog visibility and dismiss action.
 * @returns An account-scoped highlights dialog, or nothing when signed out.
 */
const HighlightsModal = (props: HighlightsModalProps) => {
  const { user } = useAuth();
  return (
    <>
      {user && (
        <HighlightsDialog
          key={`${user.id}-${props.tripId}`}
          {...props}
          userId={user.id}
        />
      )}
    </>
  );
};
export default HighlightsModal;
