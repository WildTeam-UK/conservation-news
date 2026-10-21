import type { Metadata } from 'next';
import { PublishedDigestPage, publishedDigestMetadata } from '@/components/published-digest-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const date = (await params).date;
  return publishedDigestMetadata('weekly', date);
}

export default async function WeeklyDigestPage({ params }: { params: Promise<{ date: string }> }) {
  const date = (await params).date;
  return <PublishedDigestPage type="weekly" date={date} />;
}

