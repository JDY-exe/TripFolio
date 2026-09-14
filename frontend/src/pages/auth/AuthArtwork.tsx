import { LoadingIndicator } from '../../components/common';

const artworkTransition =
  'motion-safe:transition-[opacity,translate,rotate] motion-safe:duration-700 motion-safe:ease-standard';

/**
 * Displays mode-aware decorative artwork beside the authentication forms.
 * CSS observes the native auth radio group and slides one full-size photograph
 * out as the next enters while foreground shapes move to frame the active image.
 * Motion is disabled when the visitor requests reduced motion.
 *
 * @returns Responsive decorative artwork controlled by the auth-mode radios.
 */
function AuthArtwork() {
  return (
    <div aria-hidden="true" className="hidden lg:block">
      <div className="relative isolate mx-auto aspect-[5/7] max-h-[42rem] max-w-[30rem]">
        <div
          className={`${artworkTransition} absolute -left-6 top-10 z-20 h-52 w-32 -rotate-6 rounded-t-full rounded-b-[2.5rem] bg-secondary-container group-has-[#auth-signup:checked]/auth:translate-y-80 group-has-[#auth-signup:checked]/auth:rotate-6`}
        />
        <LoadingIndicator
          size={164}
          shapeDuration={5_000}
          className={`${artworkTransition} absolute -right-12 bottom-6 z-20 rotate-12 text-primary-container group-has-[#auth-signup:checked]/auth:-translate-y-80 group-has-[#auth-signup:checked]/auth:-rotate-12`}
        />

        <div className="absolute inset-5 overflow-hidden">
          <div
            className={`${artworkTransition} absolute inset-0 overflow-hidden rounded-[4rem_1.5rem_2rem_4rem] bg-surface-container shadow-raised group-has-[#auth-signup:checked]/auth:-translate-x-full`}
          >
            <img
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85"
              alt=""
              width={1200}
              height={1680}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-on-surface/30 via-transparent to-transparent" />
          </div>

          <div
            className={`${artworkTransition} absolute inset-0 translate-x-full overflow-hidden rounded-[12rem_12rem_2.5rem_2.5rem] bg-surface-container shadow-raised group-has-[#auth-signup:checked]/auth:translate-x-0`}
          >
            <img
              src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85"
              alt=""
              width={1200}
              height={1680}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-on-surface/30 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthArtwork;
