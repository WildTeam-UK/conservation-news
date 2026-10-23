import { cleanAiText } from '@/lib/openai/house-style';
import { absoluteUrl } from '@/lib/seo';
import { digestTextGraphemes, type DigestContent, type DigestSourceStory, type DigestType } from '@/lib/digests';
import { GENERAL_TRAINING_PROMOTION } from '@/lib/training-courses';

export type DigestDistributionSource = Pick<DigestSourceStory, 'slug' | 'headline' | 'standfirst' | 'image_url' | 'image_alt' | 'image_credit' | 'published_at'>;

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

function emailDate(editionDate: string) {
  const date = new Date(`${editionDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return editionDate;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function emailImageCredit(source: DigestDistributionSource) {
  const credit = source.image_credit;
  if (!credit) return '';
  return `<p style="margin:7px 0 0;color:#777378;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;">Image: <a href="${escapeHtml(credit.creator_url)}" style="color:#6e0f6c;text-decoration:underline;">${escapeHtml(credit.creator_name)}</a> via <a href="${escapeHtml(credit.source_url)}" style="color:#6e0f6c;text-decoration:underline;">${escapeHtml(credit.source_name)}</a>.</p>`;
}

function emailStoryCard(source: DigestDistributionSource) {
  const storyUrl = absoluteUrl(`/stories/${source.slug}`);
  const imageCell = source.image_url
    ? `<td class="story-image-cell" width="38%" valign="top" style="width:38%;"><a href="${storyUrl}" style="display:block;text-decoration:none;"><img class="story-photo" src="${escapeHtml(source.image_url)}" alt="${escapeHtml(source.image_alt ?? '')}" width="220" height="190" style="display:block;width:100%;max-width:220px;height:190px;object-fit:cover;border:0;border-radius:16px 0 0 16px;" /></a></td>`
    : '';
  const imageCredit = source.image_url ? emailImageCredit(source) : '';
  return `<tr><td style="padding:0 0 18px;"><table class="story-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e3dcdf;border-radius:16px;background:#fef3e5;"><tr>${imageCell}<td class="story-copy" width="${source.image_url ? '62%' : '100%'}" valign="middle" style="padding:20px 22px;"><h3 style="margin:0 0 8px;color:#080808;font-family:'Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif;font-size:21px;line-height:1.2;"><a href="${storyUrl}" style="color:#080808;text-decoration:none;">${escapeHtml(source.headline)}</a></h3><p style="margin:0 0 13px;color:#4d4a4c;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">${escapeHtml(source.standfirst)}</p><a href="${storyUrl}" style="color:#6e0f6c;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-decoration:underline;">Read story&nbsp;&rarr;</a>${imageCredit}</td></tr></table></td></tr>`;
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

export function buildEmailDistributionPayload({ runId, type, editionDate, content, sources, listId }: { runId: string; type: DigestType; editionDate: string; content: DigestContent; sources: DigestDistributionSource[]; listId: number }): EmailDistributionPayload {
  const publicUrl = digestPublicUrl(type, editionDate);
  const label = type === 'weekly' ? 'The week in conservation' : 'Today in conservation';
  const subject = truncate(content.headline, 150);
  const overview = (content.email_overview?.filter(Boolean).length ? content.email_overview : [content.standfirst])
    .map((paragraph) => `<p style="margin:0 0 17px;color:#393638;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.65;">${escapeHtml(paragraph)}</p>`)
    .join('');
  const recentStories = [...new Map(sources.map((source) => [source.slug, source])).values()]
    .sort((first, second) => new Date(second.published_at).getTime() - new Date(first.published_at).getTime())
    .slice(0, 5);
  const storyCards = recentStories.map(emailStoryCard).join('');
  const training = GENERAL_TRAINING_PROMOTION;
  const htmlContent = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>@media only screen and (max-width:620px){.email-shell{padding:0!important}.email-card{border-radius:0!important}.email-pad{padding-left:22px!important;padding-right:22px!important}.email-title{font-size:34px!important}.email-header{padding:28px 22px!important}.story-image-cell,.story-copy{display:block!important;width:100%!important}.story-photo{width:100%!important;max-width:none!important;height:auto!important;border-radius:16px 16px 0 0!important}.story-copy{box-sizing:border-box!important;padding:20px 22px 22px!important}}</style>
</head>
<body style="margin:0;background:#eee8e2;color:#080808;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.standfirst)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee8e2;">
    <tr><td class="email-shell" align="center" style="padding:28px 12px;">
      <table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:648px;background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr><td class="email-header" style="padding:32px 38px;background:#262626;text-align:center;">
          <div style="font-family:'Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif;font-size:30px;font-weight:900;letter-spacing:-1px;"><span style="color:#ffffff;">WILD</span><span style="color:#e60088;">NEWS</span></div>
          <p style="margin:10px 0 0;color:#d9d5d7;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">${escapeHtml(label)} &nbsp;&middot;&nbsp; ${escapeHtml(emailDate(editionDate))}</p>
        </td></tr>
        <tr><td class="email-pad" style="padding:46px 42px 34px;">
          <p style="margin:0 0 14px;color:#e60088;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Your weekly briefing</p>
          <h1 class="email-title" style="margin:0 0 24px;color:#080808;font-family:'Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif;font-size:42px;line-height:1.08;letter-spacing:-.5px;">${escapeHtml(content.headline)}</h1>
          ${overview}
        </td></tr>
        ${storyCards ? `<tr><td class="email-pad" style="padding:12px 42px 34px;"><p style="margin:0 0 9px;color:#e60088;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Latest from WILDNEWS</p><h2 style="margin:0 0 24px;color:#080808;font-family:'Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif;font-size:30px;line-height:1.15;">Five stories worth your time</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${storyCards}</table></td></tr>` : ''}
        <tr><td class="email-pad" style="padding:14px 42px 34px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#262626;border-radius:16px;">
            <tr><td style="padding:30px 28px;">
              <p style="margin:0 0 10px;color:#ff7abe;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Turn knowledge into action</p>
              <h2 style="margin:0 0 12px;color:#ffffff;font-family:'Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif;font-size:28px;line-height:1.15;">${escapeHtml(training.ad_headline)}</h2>
              <p style="margin:0 0 22px;color:#d9d5d7;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;">${escapeHtml(training.ad_description)}</p>
              <a href="${escapeHtml(training.course_url)}" style="display:inline-block;border-radius:8px;background:#e60088;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;padding:13px 18px;text-decoration:none;">${escapeHtml(training.cta_label)}&nbsp;&nbsp;&rarr;</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td class="email-pad" style="padding:10px 42px 48px;text-align:center;">
          <h2 style="margin:0 0 10px;color:#080808;font-family:'Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif;font-size:27px;line-height:1.2;">There’s more to explore</h2>
          <p style="margin:0 0 22px;color:#5d5d61;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;">Read the complete briefing for the connections, context and developments to watch.</p>
          <a href="${publicUrl}" style="display:inline-block;border-radius:8px;background:#e60088;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;padding:14px 22px;text-decoration:none;">Read the full edition&nbsp;&nbsp;&rarr;</a>
        </td></tr>
        <tr><td class="email-pad" style="padding:28px 42px 32px;background:#fef3e5;border-top:1px solid #e3dcdf;">
          <p style="margin:0 0 10px;color:#5d5d61;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.55;">WILDNEWS uses AI to find, group and summarise source reporting. Its briefings are not original reporting.</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.55;"><a href="{{ unsubscribe }}" style="color:#6e0f6c;text-decoration:underline;">Unsubscribe from the Weekly Digest</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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

