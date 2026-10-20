import { useEffect, useState } from 'react';
import { getBlobFromApi } from '../../utils/api';

/**
 * Loads a protected image through Axios and exposes a temporary object URL.
 * Revoking the URL during cleanup releases the browser-held Blob allocation.
 *
 * @param imagePath - Authenticated API path for the image, when one exists.
 * @param publicImage - Optional public image supplied by static fixtures.
 * @returns An image URL when available, or undefined for the SVG placeholder.
 */
export const useProtectedImage = (
  imagePath?: string,
  publicImage?: string,
): string | undefined => {
  const [protectedImage, setProtectedImage] = useState<{
    path: string;
    url?: string;
  }>();

  useEffect(() => {
    if (!imagePath) return;

    let active = true;
    let objectUrl: string | undefined;

    /** Fetches the image with the active bearer token and creates a renderable URL. */
    const loadImage = async () => {
      try {
        const imageBlob = await getBlobFromApi(imagePath);
        if (!active) return;

        objectUrl = URL.createObjectURL(imageBlob);
        setProtectedImage({ path: imagePath, url: objectUrl });
      } catch {
        if (active) setProtectedImage({ path: imagePath, url: publicImage });
      }
    };

    void loadImage();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath, publicImage]);

  return imagePath && protectedImage?.path === imagePath
    ? protectedImage.url
    : publicImage;
};
