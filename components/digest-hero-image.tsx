'use client';

import { readableHeroColour } from '@/lib/images/colour';

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

  const winner = [...buckets.values()].sort((first, second) => {
    const firstScore = first.count * (0.8 + (first.saturation / first.count) * 0.4);
    const secondScore = second.count * (0.8 + (second.saturation / second.count) * 0.4);
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
    try {
      const colour = dominantColour(image);
      const target = document.getElementById(colourTargetId);
      if (colour && target) target.style.backgroundColor = readableHeroColour(colour);
    } catch {
      // Cross-origin or unsupported images retain the stored provider colour.
    }
  }

  // oxlint-disable-next-line next/no-img-element -- external editorial images are hotlinked under the provider licence
  return <img src={src} alt={alt} crossOrigin={canSample ? 'anonymous' : undefined} onLoad={canSample ? (event) => applyImageColour(event.currentTarget) : undefined} />;
}
