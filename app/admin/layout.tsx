import type { Metadata } from 'next';
import { AdminConfirmationProvider } from '@/components/admin-confirmation';

export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true, nocache: true } };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminConfirmationProvider>{children}</AdminConfirmationProvider>;
}
