import { cleanAiText } from '@/lib/openai/house-style';
import { absoluteUrl } from '@/lib/seo';
import { digestTextGraphemes, type DigestContent, type DigestSourceStory, type DigestType } from '@/lib/digests';

export type DigestDistributionSource = Pick<DigestSourceStory, 'slug' | 'headline' | 'standfirst'>;

export type SocialDistributionPayload = {
  text: string;
  imageUrl: string | null;
  publicUrl: string;
  source: string;
  mode: 'addToQueue' | 'shareNow';
};

export type EmailDistributionPayload = {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  listId: number;
  tag: string;
  publicUrl: string;
};

function clean(value: string) {
  return cleanAiText(value).replace(/—/g, ',').trim();
}

function escapeHtml(value: string) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncate(value: string, maximum: number) {
  const text = clean(value);
  const characters = digestTextGraphemes(text);
  if (characters.length <= maximum) return text;
  const sliced = characters.slice(0, Math.max(0, maximum - 1)).join('');
  const shortened = sliced.replace(/\s+\S*$/, '').trim();
  return `${shortened || sliced.trim()}…`;
}

function digestPublicUrl(type: DigestType, editionDate: string) {
  return absoluteUrl(`/${type === 'weekly' ? 'weekly-digest' : 'daily-digest'}/${editionDate}`);
}

export function buildSocialDistributionPayload({ deliveryId, type, editionDate, content, imageUrl, mode }: { deliveryId: string; type: DigestType; editionDate: string; content: DigestContent; imageUrl: string | null; mode: 'addToQueue' | 'shareNow' }): SocialDistributionPayload {
  const publicUrl = digestPublicUrl(type, editionDate);
  const attribution = content.image_credit ? truncate(`Photo: ${content.image_credit.creator_name} / ${content.image_credit.source_name}`, 60) : '';
  const available = Math.max(40, 280 - publicUrl.length - attribution.length - 6);
  const fallback = `${type === 'weekly' ? '🌍' : '🌿'} ${content.standfirst} ${type === 'weekly' ? 'Catch up with the full weekly digest' : 'Read today’s full digest'} 👇`;
  const socialPost = truncate(content.social_post || fallback, available);
  return {
    text: `${socialPost}\n\n${publicUrl}${attribution ? `\n\n${attribution}` : ''}`,
    imageUrl,
    publicUrl,
    source: `wildnews-digest-${deliveryId}`,
    mode,
  };
}

export function buildEmailDistributionPayload({ runId, type, editionDate, content, sources, imageUrl, listId }: { runId: string; type: DigestType; editionDate: string; content: DigestContent; sources: DigestDistributionSource[]; imageUrl: string | null; listId: number }): EmailDistributionPayload {
  const publicUrl = digestPublicUrl(type, editionDate);
  const label = type === 'weekly' ? 'The week in conservation' : 'Today in conservation';
  const subject = truncate(content.headline, 150);
  const introduction = content.introduction.map((paragraph) => `<p style="margin:0 0 18px;line-height:1.65;color:#292929;font-size:17px;">${escapeHtml(paragraph)}</p>`).join('');
  const sections = content.sections.map((section) => `<section style="margin:34px 0;"><h2 style="margin:0 0 14px;color:#292929;font-size:25px;line-height:1.15;">${escapeHtml(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p style="margin:0 0 16px;line-height:1.65;color:#292929;font-size:16px;">${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('');
  const sourceList = sources.map((source) => `<li style="margin:0 0 12px;"><a href="${absoluteUrl(`/stories/${source.slug}`)}" style="color:#6e0f6c;font-weight:700;">${escapeHtml(source.headline)}</a></li>`).join('');
  const credit = content.image_credit;
  const attribution = credit ? `<p style="margin:-20px 0 28px;color:#666;font-size:11px;line-height:1.4;">Image: <a href="${escapeHtml(credit.creator_url)}" style="color:#6e0f6c;">${escapeHtml(credit.creator_name)}</a> via <a href="${escapeHtml(credit.source_url)}" style="color:#6e0f6c;">${escapeHtml(credit.source_name)}</a>. ${escapeHtml(credit.licence_name)}.</p>` : '';
  const image = imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" width="680" style="display:block;width:100%;max-width:680px;height:auto;margin:0 0 28px;border-radius:18px;" />${attribution}` : '';
  const htmlContent = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f2ed;font-family:Arial,sans-serif;color:#292929;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.standfirst)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f2ed;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border-radius:18px;"><tr><td style="padding:34px 20px 16px;text-align:center;"><strong style="font-size:28px;letter-spacing:-1px;"><span style="color:#6e0f6c;">WILD</span><span style="color:#e60088;">NEWS</span></strong><p style="margin:12px 0 0;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(label)} · ${escapeHtml(editionDate)}</p></td></tr><tr><td style="padding:16px 20px 38px;">${image}<h1 style="margin:0 0 16px;color:#292929;font-size:38px;line-height:1.05;">${escapeHtml(content.headline)}</h1><p style="margin:0 0 28px;color:#555;font-size:20px;line-height:1.45;">${escapeHtml(content.standfirst)}</p>${introduction}${sections}<p style="margin:34px 0;text-align:center;"><a href="${publicUrl}" style="display:inline-block;background:#e60088;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:6px;">Read the full edition</a></p>${sourceList ? `<h2 style="margin:36px 0 14px;font-size:22px;">Stories in this edition</h2><ul style="padding-left:22px;line-height:1.5;">${sourceList}</ul>` : ''}<hr style="border:0;border-top:1px solid #ddd;margin:36px 0 22px;"><p style="color:#666;font-size:12px;line-height:1.5;">WILDNEWS uses AI to find, group and summarise source reporting. Its briefings are not original reporting.</p><p style="font-size:12px;"><a href="{{ unsubscribe }}" style="color:#6e0f6c;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`;
  return {
    name: `WILDNEWS ${type} digest ${editionDate} [${runId}]`,
    subject,
    previewText: truncate(content.standfirst, 180),
    htmlContent,
    listId,
    tag: `wildnews-${type}-${editionDate}`,
    publicUrl,
  };
}

