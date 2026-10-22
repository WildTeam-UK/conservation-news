'use client';

import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/react';
import { usePathname } from 'next/navigation';

function performanceRoute(pathname: string) {
  if (/^\/stories\/[^/]+$/.test(pathname)) return '/stories/[slug]';
  if (/^\/daily-digest\/[^/]+$/.test(pathname)) return '/daily-digest/[date]';
  if (/^\/weekly-digest\/[^/]+$/.test(pathname)) return '/weekly-digest/[date]';
  if (/^\/topics\/[^/]+$/.test(pathname)) return '/topics/[topic]';
  if (/^\/tags\/[^/]+$/.test(pathname)) return '/tags/[tag]';
  return pathname;
}

export function SpeedInsights() {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  return <VercelSpeedInsights route={performanceRoute(pathname)} />;
}
