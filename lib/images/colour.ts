export const FALLBACK_HERO_COLOUR = '#6e0f6c';

function channelLuminance(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function contrastWithWhite(red: number, green: number, blue: number) {
  const luminance = (0.2126 * channelLuminance(red)) + (0.7152 * channelLuminance(green)) + (0.0722 * channelLuminance(blue));
  return 1.05 / (luminance + 0.05);
}

export function readableHeroColour(value?: string | null) {
  if (!/^#[0-9a-f]{6}$/i.test(value ?? '')) return FALLBACK_HERO_COLOUR;
  const hex = value!.slice(1);
  const original = [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
  let factor = 1;
  let colour = original;
  while (contrastWithWhite(colour[0], colour[1], colour[2]) < 4.5 && factor > 0.2) {
    factor *= 0.88;
    colour = original.map((channel) => Math.round(channel * factor));
  }
  return `#${colour.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
