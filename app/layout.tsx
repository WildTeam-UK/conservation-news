import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WILDNEWS | Conservation, clearly told',
  description: 'Independent reporting from the front lines of conservation.',
  openGraph: {
    title: 'WILDNEWS | Conservation, clearly told',
    description: 'Independent reporting from the front lines of conservation.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WILDNEWS | Conservation, clearly told',
    description: 'Independent reporting from the front lines of conservation.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
