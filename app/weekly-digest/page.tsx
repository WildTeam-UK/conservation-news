import { redirect } from 'next/navigation';

export default async function WeeklyDigestArchive() {
  redirect('/digests#weekly');
}
