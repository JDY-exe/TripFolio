import type { Trip } from '../../queries/trips';
import TripPlaceholderArt from './TripPlaceholderArt';
import { useProtectedImage } from './useProtectedImage';

/** Loads the trip cover with authentication, falling back to the shared landscape.
 * @param props - Invited trip with its optional cover identifier.
 * @returns A compact cover thumbnail or SVG placeholder.
 */
const InvitationCover = ({ trip }: { trip: Trip }) => {
  const image = useProtectedImage(
    trip.profilePictureId
      ? `/trip/${trip._id}/profile_picture?v=${trip.profilePictureId}`
      : undefined,
  );
  return (
    <>
      {image && (
        <img
          data-cy="invitation-trip-picture"
          src={image}
          alt=""
          className="h-full w-full object-cover"
        />
      )}
      {!image && (
        <div className="h-full w-full [&>svg]:h-full [&>svg]:object-cover">
          <TripPlaceholderArt />
        </div>
      )}
    </>
  );
};

export default InvitationCover;
