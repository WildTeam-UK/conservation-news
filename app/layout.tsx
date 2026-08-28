import type { Metadata } from 'next';
import { Nunito_Sans } from 'next/font/google';
import './globals.css';

const rounded = Nunito_Sans({ variable: '--font-rounded', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WildNews — Conservation, clearly told',
  description: 'Independent reporting from the front lines of conservation.',
  openGraph: {
    title: 'WildNews — Conservation, clearly told',
    description: 'Independent reporting from the front lines of conservation.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WildNews — Conservation, clearly told',
    description: 'Independent reporting from the front lines of conservation.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={rounded.variable}>{children}</body></html>;
}
