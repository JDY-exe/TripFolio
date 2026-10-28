import { Images, Map } from 'lucide-react';
import { Button } from '../../../components/common';

export type AlbumTab = 'photos' | 'map';

interface AlbumMobileTabsProps {
  value: AlbumTab;
  onChange: (tab: AlbumTab) => void;
}

/** Switches the mobile workspace between full-width photos and map views.
 * @param props - Selected view and selection callback.
 * @returns Two accessible tabs with arrow-key, Home, and End navigation.
 */
const AlbumMobileTabs = ({ value, onChange }: AlbumMobileTabsProps) => (
  <div
    role="tablist"
    aria-label="Album views"
    className="mb-4 grid shrink-0 grid-cols-2 gap-1 rounded-full bg-surface-container-low p-1 lg:hidden"
    onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
        return;
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 'photos'
          : event.key === 'End'
            ? 'map'
            : value === 'photos'
              ? 'map'
              : 'photos';
      onChange(next);
      event.currentTarget
        .querySelector<HTMLButtonElement>(`#album-tab-${next}`)
        ?.focus();
    }}
  >
    <Button
      id="album-tab-photos"
      role="tab"
      aria-selected={value === 'photos'}
      aria-controls="album-photos-panel"
      tabIndex={value === 'photos' ? 0 : -1}
      variant={value === 'photos' ? 'secondary' : 'ghost'}
      leadingIcon={<Images size={18} />}
      onClick={() => onChange('photos')}
      data-cy="album-tab-photos"
    >
      Photos
    </Button>
    <Button
      id="album-tab-map"
      role="tab"
      aria-selected={value === 'map'}
      aria-controls="album-map-panel"
      tabIndex={value === 'map' ? 0 : -1}
      variant={value === 'map' ? 'secondary' : 'ghost'}
      leadingIcon={<Map size={18} />}
      onClick={() => onChange('map')}
      data-cy="album-tab-map"
    >
      Map
    </Button>
  </div>
);

export default AlbumMobileTabs;
