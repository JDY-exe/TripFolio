import type { Map as MapLibreMap } from 'maplibre-gl';

/** Chooses a quiet basemap matching the system color scheme.
 * @returns OpenFreeMap Dark or Positron style URL.
 */
export const getMapStyleUrl = () =>
  `https://tiles.openfreemap.org/styles/${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'positron'}`;

/** Applies semantic colors and reduces detail for the sidebar or expanded map.
 * @param map - A loaded OpenFreeMap Dark or Positron map.
 * @param interactive - Whether to reveal street names and buildings at close zoom.
 * @returns Nothing; updates the map paint and label visibility in place.
 */
export const applyMapTheme = (map: MapLibreMap, interactive: boolean) => {
  const tokens = getComputedStyle(document.documentElement);
  /** Reads a semantic color by token name, including the active system theme. */
  const color = (name: string) =>
    tokens.getPropertyValue(`--color-${name}`).trim();
  for (const layer of map.getStyle().layers) {
    const id = layer.id.toLowerCase();
    const source = 'source-layer' in layer ? layer['source-layer'] : '';
    if (source === 'building' || layer.type === 'fill-extrusion') {
      map.setLayoutProperty(
        layer.id,
        'visibility',
        interactive && layer.type === 'fill' ? 'visible' : 'none',
      );
      if (interactive && layer.type === 'fill') {
        map.setLayerZoomRange(layer.id, 16, 24);
        map.setPaintProperty(layer.id, 'fill-color', color('outline-variant'));
        map.setPaintProperty(layer.id, 'fill-opacity', 0.18);
        map.setPaintProperty(
          layer.id,
          'fill-outline-color',
          color('surface-container-high'),
        );
      }
      continue;
    }
    if (source === 'aeroway' || /casing|railway|oneway/.test(id)) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
      continue;
    }
    if (layer.type === 'background')
      map.setPaintProperty(layer.id, 'background-color', color('surface'));
    if (layer.type === 'fill') {
      const token = /water/.test(id)
        ? 'surface-container-high'
        : /park|wood|grass|landcover/.test(id)
          ? 'secondary-container'
          : 'surface';
      map.setPaintProperty(layer.id, 'fill-color', color(token));
      map.setPaintProperty(layer.id, 'fill-pattern', undefined);
      map.setPaintProperty(
        layer.id,
        'fill-opacity',
        /water/.test(id) ? 1 : 0.18,
      );
    }
    if (layer.type === 'line' && source === 'transportation') {
      const major = /major|motorway/.test(id);
      map.setPaintProperty(layer.id, 'line-color', color('outline-variant'));
      map.setPaintProperty(layer.id, 'line-opacity', major ? 0.6 : 0.35);
      map.setPaintProperty(layer.id, 'line-width', [
        'interpolate',
        ['linear'],
        ['zoom'],
        6,
        0.4,
        13,
        major ? 1.2 : 0.7,
        18,
        major ? 4 : 2,
      ]);
    } else if (layer.type === 'line') {
      map.setPaintProperty(layer.id, 'line-color', color('outline-variant'));
      map.setPaintProperty(
        layer.id,
        'line-opacity',
        source === 'waterway' ? 0.3 : 0.15,
      );
    }
    if (layer.type === 'symbol') {
      const placeLabel =
        source === 'place' && /city|town|state|country|suburb/.test(id);
      const streetLabel =
        interactive &&
        source === 'transportation_name' &&
        !/shield|motorway/.test(id);
      map.setLayoutProperty(
        layer.id,
        'visibility',
        placeLabel || streetLabel ? 'visible' : 'none',
      );
      if (placeLabel || streetLabel) {
        if (streetLabel)
          map.setLayerZoomRange(layer.id, Math.max(layer.minzoom ?? 0, 15), 24);
        map.setLayoutProperty(layer.id, 'text-field', [
          'coalesce',
          ['get', 'name:en'],
          ['get', 'name_en'],
          ['get', 'name:latin'],
          ['get', 'name'],
        ]);
        map.setLayoutProperty(
          layer.id,
          'text-size',
          /city|country/.test(id) ? 12 : 10,
        );
        map.setLayoutProperty(layer.id, 'text-padding', interactive ? 12 : 28);
        map.setLayoutProperty(layer.id, 'text-allow-overlap', false);
        map.setPaintProperty(layer.id, 'icon-opacity', 0);
        map.setPaintProperty(
          layer.id,
          'text-color',
          color('on-surface-variant'),
        );
        map.setPaintProperty(layer.id, 'text-halo-color', color('surface'));
        map.setPaintProperty(layer.id, 'text-halo-width', 1);
        map.setPaintProperty(
          layer.id,
          'text-opacity',
          streetLabel ? 0.55 : 0.65,
        );
      }
    }
  }
};
