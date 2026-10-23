import { clampScore } from '@/lib/scores';
import { safeHttpUrl } from '@/lib/urls';

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

export type LinkPlanRejectionReason =
  | 'below_confidence'
  | 'type_limit'
  | 'taxonomy_limit'
  | 'target_missing'
  | 'location_missing'
  | 'duplicate_target'
  | 'invalid_anchor'
  | 'total_limit';

export type LinkPlanDiagnostics = {
  proposedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  rejectionReasons: Partial<Record<LinkPlanRejectionReason, number>>;
  acceptedTypes: Partial<Record<ArticleLinkType, number>>;
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
export const CONTEXTUAL_LINK_TYPE_LIMITS: Record<ArticleLinkType, number> = { article: 2, topic: 1, tag: 1, course: 1, source: 1 };
export const MAX_CONTEXTUAL_LINKS = 5;

export function createLinkPlanDiagnostics(proposedCount: number): LinkPlanDiagnostics {
  return { proposedCount, acceptedCount: 0, rejectedCount: 0, rejectionReasons: {}, acceptedTypes: {} };
}

export function recordLinkPlanRejection(diagnostics: LinkPlanDiagnostics, reason: LinkPlanRejectionReason) {
  diagnostics.rejectedCount += 1;
  diagnostics.rejectionReasons[reason] = (diagnostics.rejectionReasons[reason] ?? 0) + 1;
}

export function recordAcceptedLink(diagnostics: LinkPlanDiagnostics, type: ArticleLinkType) {
  diagnostics.acceptedCount += 1;
  diagnostics.acceptedTypes[type] = (diagnostics.acceptedTypes[type] ?? 0) + 1;
}

function safeHref(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return safeHttpUrl(value) ?? '';
}

function isWordEdgeCharacter(value: string | undefined) {
  return Boolean(value && /[\p{L}\p{M}\p{N}_’'-]/u.test(value));
}

export function contextualLinkOccurrence(text: string, anchor: string) {
  const haystack = text.toLocaleLowerCase('en-GB');
  const needle = anchor.toLocaleLowerCase('en-GB');
  let from = 0;
  while (needle && from <= haystack.length - needle.length) {
    const start = haystack.indexOf(needle, from);
    if (start < 0) return -1;
    const end = start + needle.length;
    if (!isWordEdgeCharacter(text[start - 1]) && !isWordEdgeCharacter(text[end])) return start;
    from = start + 1;
  }
  return -1;
}

export function contextualLinkMinimumConfidence(type: ArticleLinkType) {
  return type === 'course' ? 85 : 75;
}

export function cleanArticleLinks(text: string, links: ArticleContextualLink[] | undefined) {
  const cleaned: ArticleContextualLink[] = [];
  const occupied: Array<[number, number]> = [];
  const usedTargets = new Set<string>();
  const usedAnchors = new Set<string>();
  for (const link of links ?? []) {
    const anchor = String(link.anchor_text ?? '').trim().slice(0, 140);
    const href = safeHref(String(link.href ?? '').trim());
    const targetId = String(link.target_id ?? '').slice(0, 200);
    const targetKey = `${link.type}:${targetId}`;
    const anchorKey = `${href}:${anchor.toLocaleLowerCase('en-GB')}`;
    const start = contextualLinkOccurrence(text, anchor);
    const end = start + anchor.length;
    if (!href || anchor.length < 4 || GENERIC_ANCHORS.has(anchor.toLocaleLowerCase('en-GB')) || start < 0 || usedTargets.has(targetKey) || usedAnchors.has(anchorKey) || occupied.some(([from, to]) => start < to && end > from)) continue;
    occupied.push([start, end]);
    usedTargets.add(targetKey);
    usedAnchors.add(anchorKey);
    cleaned.push({
      type: link.type,
      target_id: targetId,
      href,
      anchor_text: text.slice(start, end),
      external: href.startsWith('http://') || href.startsWith('https://'),
      confidence: clampScore(link.confidence),
      rationale: String(link.rationale ?? '').trim().slice(0, 400),
    });
  }
  return cleaned.sort((a, b) => contextualLinkOccurrence(text, a.anchor_text) - contextualLinkOccurrence(text, b.anchor_text));
}

function sectionItem(article: LinkableArticle, section: ArticleLinkSection, itemIndex: number): LinkableText | null {
  if (section === 'why_it_matters' || section === 'what_happens_next') return itemIndex === 0 ? article[section] : null;
  return article[section][itemIndex] ?? null;
}

export function evaluateArticleLinkPlan<T extends LinkableArticle>(article: T, plan: ArticleLinkPlanItem[], targets: ArticleLinkTarget[]) {
  const targetMap = new Map(targets.map((target) => [`${target.type}:${target.id}`, target]));
  const typeCounts: Record<ArticleLinkType, number> = { article: 0, topic: 0, tag: 0, course: 0, source: 0 };
  const usedTargets = new Set<string>();
  const taxonomyCount = () => typeCounts.topic + typeCounts.tag;
  const diagnostics = createLinkPlanDiagnostics(plan.length);
  let total = 0;

  for (const proposed of [...plan].sort((a, b) => Number(b.confidence) - Number(a.confidence))) {
    if (total >= MAX_CONTEXTUAL_LINKS) {
      recordLinkPlanRejection(diagnostics, 'total_limit');
      continue;
    }
    const confidence = clampScore(proposed.confidence);
    const threshold = contextualLinkMinimumConfidence(proposed.target_type);
    if (confidence < threshold) {
      recordLinkPlanRejection(diagnostics, 'below_confidence');
      continue;
    }
    if (typeCounts[proposed.target_type] >= CONTEXTUAL_LINK_TYPE_LIMITS[proposed.target_type]) {
      recordLinkPlanRejection(diagnostics, 'type_limit');
      continue;
    }
    if ((proposed.target_type === 'topic' || proposed.target_type === 'tag') && taxonomyCount() >= 1) {
      recordLinkPlanRejection(diagnostics, 'taxonomy_limit');
      continue;
    }
    const targetKey = `${proposed.target_type}:${proposed.target_id}`;
    const target = targetMap.get(targetKey);
    const item = sectionItem(article, proposed.section, Math.max(0, Math.round(Number(proposed.item_index) || 0)));
    if (!target) {
      recordLinkPlanRejection(diagnostics, 'target_missing');
      continue;
    }
    if (!item) {
      recordLinkPlanRejection(diagnostics, 'location_missing');
      continue;
    }
    if (usedTargets.has(targetKey)) {
      recordLinkPlanRejection(diagnostics, 'duplicate_target');
      continue;
    }
    const candidate: ArticleContextualLink = { type: target.type, target_id: target.id, href: target.href, anchor_text: proposed.anchor_text, external: target.external, confidence, rationale: proposed.rationale };
    const existing = cleanArticleLinks(item.text, item.links);
    const accepted = cleanArticleLinks(item.text, [...existing, candidate]);
    if (accepted.length === existing.length) {
      recordLinkPlanRejection(diagnostics, 'invalid_anchor');
      continue;
    }
    item.links = accepted;
    usedTargets.add(targetKey);
    typeCounts[target.type] += 1;
    total += 1;
    recordAcceptedLink(diagnostics, target.type);
  }
  return { article, diagnostics };
}

export function applyArticleLinkPlan<T extends LinkableArticle>(article: T, plan: ArticleLinkPlanItem[], targets: ArticleLinkTarget[]): T {
  return evaluateArticleLinkPlan(article, plan, targets).article;
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

