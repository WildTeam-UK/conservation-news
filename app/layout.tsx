import type { Metadata } from 'next';
import { DM_Sans, Libre_Franklin, Newsreader } from 'next/font/google';
import './globals.css';

const sans = DM_Sans({ variable: '--font-sans', subsets: ['latin'] });
const ui = Libre_Franklin({ variable: '--font-ui', subsets: ['latin'] });
const serif = Newsreader({ variable: '--font-serif', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fieldnote — Conservation, clearly told',
  description: 'Independent reporting from the front lines of conservation.',
  openGraph: {
    title: 'Fieldnote — Conservation, clearly told',
    description: 'Independent reporting from the front lines of conservation.',
    images: [{ url: '/og.png', width: 1760, height: 917, alt: 'Fieldnote — Conservation, clearly told' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fieldnote — Conservation, clearly told',
    description: 'Independent reporting from the front lines of conservation.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${ui.variable} ${serif.variable}`}>{children}</body></html>;
}
