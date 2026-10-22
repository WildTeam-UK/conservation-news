import type { Metadata } from 'next';
import { PublishedDigestPage, publishedDigestMetadata } from '@/components/published-digest-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const date = (await params).date;
  return publishedDigestMetadata('daily', date);
}

export default async function DailyDigestPage({ params }: { params: Promise<{ date: string }> }) {
  const date = (await params).date;
  return <PublishedDigestPage type="daily" date={date} />;
}

