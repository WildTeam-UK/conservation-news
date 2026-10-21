import type { EditorialImageCredit as EditorialImageCreditData } from '@/lib/images/types';

export function EditorialImageCredit({ credit }: { credit?: EditorialImageCreditData | null }) {
  if (!credit) return null;
  return (
    <figcaption className="editorial-image-credit">
      {credit.illustrative ? 'Illustrative image ' : ''}by {credit.creator_url ? <a href={credit.creator_url} target="_blank" rel="noreferrer">{credit.creator_name}</a> : credit.creator_name}
      {credit.source_name ? <> on {credit.source_url ? <a href={credit.source_url} target="_blank" rel="noreferrer">{credit.source_name}</a> : credit.source_name}</> : null}
      {credit.licence_name ? <> | {credit.licence_url ? <a href={credit.licence_url} target="_blank" rel="noreferrer">{credit.licence_name}</a> : credit.licence_name}</> : null}
    </figcaption>
  );
}
