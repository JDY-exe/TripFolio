import { useEffect, useState, type RefObject } from 'react';
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { applyMapTheme, getMapStyleUrl } from './mapTheme';

setWorkerUrl(workerUrl);

/** Owns the map renderer, resizing, system theme changes, and cleanup.
 * @param container - Mounted map surface.
 * @param interactive - Whether pan and zoom controls are enabled.
 * @returns The loaded map and renderer error state.
 */
export const useMapRuntime = (
  container: RefObject<HTMLDivElement | null>,
  interactive: boolean,
) => {
  const [map, setMap] = useState<MapLibreMap>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    let instance: MapLibreMap;
    try {
      instance = new MapLibreMap({
        container: container.current,
        style: getMapStyleUrl(),
        pitch: 0,
        bearing: 0,
        maxPitch: 0,
        dragRotate: false,
        pitchWithRotate: false,
        center: [0, 20],
        zoom: 1,
        interactive,
        attributionControl: false,
      });
    } catch {
      const frame = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(frame);
    }
    instance.touchZoomRotate.disableRotation();
    instance.on('style.load', () => {
      applyMapTheme(instance, interactive);
      setFailed(false);
    });
    instance.on('load', () => {
      setMap(instance);
    });
    instance.on('error', () => {
      if (!instance.isStyleLoaded()) setFailed(true);
    });
    if (interactive)
      instance.addControl(
        new NavigationControl({ showCompass: false }),
        'top-right',
      );
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    const theme = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      instance.setStyle(getMapStyleUrl());
    };
    theme.addEventListener('change', updateTheme);
    return () => {
      theme.removeEventListener('change', updateTheme);
      observer.disconnect();
      instance.remove();
    };
  }, [container, interactive]);
  return { map, failed };
};
