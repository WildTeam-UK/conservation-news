'use client';

import { FALLBACK_HERO_COLOUR, readableHeroColour } from '@/lib/images/colour';

type PaletteColour = { hex?: string };

type ImagePalette = {
  colors?: PaletteColour[];
  dominant_colors?: {
    vibrant?: PaletteColour;
    vibrant_dark?: PaletteColour;
    muted?: PaletteColour;
    muted_dark?: PaletteColour;
  };
};

function paletteUrl(src: string) {
  const url = new URL(src);
  url.searchParams.delete('fm');
  url.searchParams.set('palette', 'json');
  url.searchParams.set('colors', '6');
  return url.toString();
}

function preferredPaletteColour(palette: ImagePalette) {
  return palette.dominant_colors?.vibrant?.hex
    ?? palette.dominant_colors?.vibrant_dark?.hex
    ?? palette.dominant_colors?.muted?.hex
    ?? palette.dominant_colors?.muted_dark?.hex
    ?? palette.colors?.find((colour) => colour.hex)?.hex
    ?? null;
}

export function DigestHeroImage({ src, alt, colourTargetId }: { src: string; alt: string; colourTargetId: string }) {
  let canRequestPalette = false;
  try {
    canRequestPalette = new URL(src).hostname.endsWith('unsplash.com');
  } catch {
    canRequestPalette = false;
  }

  function applyFallbackColour() {
    const target = document.getElementById(colourTargetId);
    if (target) target.style.backgroundColor = FALLBACK_HERO_COLOUR;
  }

  async function applyImageColour() {
    try {
      const response = await fetch(paletteUrl(src));
      if (!response.ok) throw new Error(`Image palette request failed with ${response.status}.`);
      const palette = await response.json() as ImagePalette;
      const target = document.getElementById(colourTargetId);
      if (target) target.style.backgroundColor = readableHeroColour(preferredPaletteColour(palette));
    } catch {
      applyFallbackColour();
    }
  }

  // oxlint-disable-next-line next/no-img-element -- external editorial images are hotlinked under the provider licence
  return <img src={src} alt={alt} onLoad={canRequestPalette ? () => { void applyImageColour(); } : undefined} onError={applyFallbackColour} />;
}
