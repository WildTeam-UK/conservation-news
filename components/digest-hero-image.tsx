'use client';

import { FALLBACK_HERO_COLOUR, readableHeroColour } from '@/lib/images/colour';

function dominantColour(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map<string, { count: number; red: number; green: number; blue: number; saturation: number }>();

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue;
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
    const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0, saturation: 0 };
    bucket.count += 1;
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    bucket.saturation += maximum ? (maximum - minimum) / maximum : 0;
    buckets.set(key, bucket);
  }

  const candidates = [...buckets.values()];
  const colourfulCandidates = candidates.filter((bucket) => (bucket.saturation / bucket.count) >= 0.18);
  const colourfulPixelCount = colourfulCandidates.reduce((total, bucket) => total + bucket.count, 0);
  const eligibleCandidates = colourfulPixelCount >= (canvas.width * canvas.height * 0.08)
    ? colourfulCandidates
    : candidates;
  const winner = eligibleCandidates.sort((first, second) => {
    const firstSaturation = first.saturation / first.count;
    const secondSaturation = second.saturation / second.count;
    const firstScore = first.count * (0.4 + firstSaturation * 1.6);
    const secondScore = second.count * (0.4 + secondSaturation * 1.6);
    return secondScore - firstScore;
  })[0];
  if (!winner) return null;
  const channels = [winner.red, winner.green, winner.blue].map((value) => Math.round(value / winner.count));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function DigestHeroImage({ src, alt, colourTargetId }: { src: string; alt: string; colourTargetId: string }) {
  let canSample = false;
  try {
    canSample = new URL(src).hostname.endsWith('unsplash.com');
  } catch {
    canSample = false;
  }

  function applyImageColour(image: HTMLImageElement) {
    const target = document.getElementById(colourTargetId);
    try {
      const colour = dominantColour(image);
      if (target) target.style.backgroundColor = readableHeroColour(colour);
    } catch {
      if (target) target.style.backgroundColor = FALLBACK_HERO_COLOUR;
    }
  }

  function applyFallbackColour() {
    const target = document.getElementById(colourTargetId);
    if (target) target.style.backgroundColor = FALLBACK_HERO_COLOUR;
  }

  // oxlint-disable-next-line next/no-img-element -- external editorial images are hotlinked under the provider licence
  return <img src={src} alt={alt} crossOrigin={canSample ? 'anonymous' : undefined} onLoad={canSample ? (event) => applyImageColour(event.currentTarget) : undefined} onError={applyFallbackColour} />;
}
