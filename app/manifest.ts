import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WILDNEWS',
    short_name: 'WILDNEWS',
    description: 'Source-led conservation news, clearly summarised.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6e0f6c',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
