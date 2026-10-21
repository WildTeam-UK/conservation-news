import { clampScore } from '@/lib/scores';

export const ARTICLE_LINK_SECTIONS = ['key_takeaways', 'why_it_matters', 'what_happens_next', 'what_we_know', 'what_we_dont_know'] as const;

export type ArticleLinkSection = typeof ARTICLE_LINK_SECTIONS[number];
export type ArticleLinkType = 'article' | 'topic' | 'tag' | 'course' | 'source';

export type ArticleContextualLink = {
  type: ArticleLinkType;
  target_id: string;
  href: string;
  anchor_text: string;
  external: boolean;
  confidence: number;
  rationale: string;
};

export type ArticleLinkPlanItem = {
  section: ArticleLinkSection;
  item_index: number;
  anchor_text: string;
  target_type: ArticleLinkType;
  target_id: string;
  confidence: number;
  rationale: string;
};

export type ArticleLinkTarget = {
  id: string;
  type: ArticleLinkType;
  href: string;
  title: string;
  description: string;
  external: boolean;
};

export type StoredArticleContextualLink = ArticleContextualLink & {
  section_key: ArticleLinkSection;
  item_index: number;
};

type LinkableText = { text: string; links?: ArticleContextualLink[] };
type LinkableArticle = {
  key_takeaways: LinkableText[];
  why_it_matters: LinkableText;
  what_happens_next: LinkableText;
  what_we_know: LinkableText[];
  what_we_dont_know: LinkableText[];
};

const GENERIC_ANCHORS = new Set(['click here', 'read more', 'learn more', 'this article', 'this story', 'website', 'source']);
const TYPE_LIMITS: Record<ArticleLinkType, number> = { article: 2, topic: 1, tag: 1, course: 1, source: 1 };
const MAX_LINKS = 5;

function safeHref(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function occurrence(text: string, anchor: string) {
  return text.toLocaleLowerCase('en-GB').indexOf(anchor.toLocaleLowerCase('en-GB'));
}

export function cleanArticleLinks(text: string, links: ArticleContextualLink[] | undefined) {
  const cleaned: ArticleContextualLink[] = [];
  const occupied: Array<[number, number]> = [];
  for (const link of links ?? []) {
    const anchor = String(link.anchor_text ?? '').trim().slice(0, 140);
    const href = safeHref(String(link.href ?? '').trim());
    const start = occurrence(text, anchor);
    const end = start + anchor.length;
    if (!href || anchor.length < 4 || GENERIC_ANCHORS.has(anchor.toLocaleLowerCase('en-GB')) || start < 0 || occupied.some(([from, to]) => start < to && end > from)) continue;
    occupied.push([start, end]);
    cleaned.push({
      type: link.type,
      target_id: String(link.target_id ?? '').slice(0, 200),
      href,
      anchor_text: text.slice(start, end),
      external: href.startsWith('http://') || href.startsWith('https://'),
      confidence: clampScore(link.confidence),
      rationale: String(link.rationale ?? '').trim().slice(0, 400),
    });
  }
  return cleaned.sort((a, b) => occurrence(text, a.anchor_text) - occurrence(text, b.anchor_text));
}

function sectionItem(article: LinkableArticle, section: ArticleLinkSection, itemIndex: number): LinkableText | null {
  if (section === 'why_it_matters' || section === 'what_happens_next') return itemIndex === 0 ? article[section] : null;
  return article[section][itemIndex] ?? null;
}

export function applyArticleLinkPlan<T extends LinkableArticle>(article: T, plan: ArticleLinkPlanItem[], targets: ArticleLinkTarget[]): T {
  const targetMap = new Map(targets.map((target) => [`${target.type}:${target.id}`, target]));
  const typeCounts: Record<ArticleLinkType, number> = { article: 0, topic: 0, tag: 0, course: 0, source: 0 };
  const usedTargets = new Set<string>();
  const taxonomyCount = () => typeCounts.topic + typeCounts.tag;
  let total = 0;

  for (const proposed of [...plan].sort((a, b) => Number(b.confidence) - Number(a.confidence))) {
    if (total >= MAX_LINKS) break;
    const confidence = clampScore(proposed.confidence);
    const threshold = proposed.target_type === 'course' ? 85 : 75;
    if (confidence < threshold || typeCounts[proposed.target_type] >= TYPE_LIMITS[proposed.target_type]) continue;
    if ((proposed.target_type === 'topic' || proposed.target_type === 'tag') && taxonomyCount() >= 1) continue;
    const targetKey = `${proposed.target_type}:${proposed.target_id}`;
    const target = targetMap.get(targetKey);
    const item = sectionItem(article, proposed.section, Math.max(0, Math.round(Number(proposed.item_index) || 0)));
    if (!target || !item || usedTargets.has(targetKey)) continue;
    const candidate: ArticleContextualLink = { type: target.type, target_id: target.id, href: target.href, anchor_text: proposed.anchor_text, external: target.external, confidence, rationale: proposed.rationale };
    const existing = cleanArticleLinks(item.text, item.links);
    const accepted = cleanArticleLinks(item.text, [...existing, candidate]);
    if (accepted.length === existing.length) continue;
    item.links = accepted;
    usedTargets.add(targetKey);
    typeCounts[target.type] += 1;
    total += 1;
  }
  return article;
}

export function countArticleLinks(article: Partial<LinkableArticle>) {
  const lists = [article.key_takeaways ?? [], article.what_we_know ?? [], article.what_we_dont_know ?? []];
  return lists.flat().reduce((sum, item) => sum + (item.links?.length ?? 0), 0)
    + (article.why_it_matters?.links?.length ?? 0)
    + (article.what_happens_next?.links?.length ?? 0);
}

export function articleLinkRows(storyId: string, article: LinkableArticle) {
  const rows: Array<{ story_id: string; link_type: ArticleLinkType; target_id: string; href: string; anchor_text: string; section_key: ArticleLinkSection; item_index: number; external: boolean; confidence: number; rationale: string }> = [];
  for (const section of ARTICLE_LINK_SECTIONS) {
    const items = section === 'why_it_matters' || section === 'what_happens_next' ? [article[section]] : article[section];
    items.forEach((item, itemIndex) => cleanArticleLinks(item.text, item.links).forEach((link) => rows.push({ story_id: storyId, link_type: link.type, target_id: link.target_id, href: link.href, anchor_text: link.anchor_text, section_key: section, item_index: itemIndex, external: link.external, confidence: link.confidence, rationale: link.rationale })));
  }
  return rows;
}

export function attachStoredArticleLinks<T extends LinkableArticle>(article: T, storedLinks: StoredArticleContextualLink[]): T {
  for (const section of ARTICLE_LINK_SECTIONS) {
    const items = section === 'why_it_matters' || section === 'what_happens_next' ? [article[section]] : article[section];
    items.forEach((item, itemIndex) => {
      const links = cleanArticleLinks(item.text, storedLinks.filter((link) => link.section_key === section && link.item_index === itemIndex));
      item.links = links.length ? links : undefined;
    });
  }
  return article;
}

