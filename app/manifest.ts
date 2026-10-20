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
      { src: '/favicon.png', sizes: '50x50', type: 'image/png' },
    ],
  };
}
