import {
  cleanArticleLinks,
  contextualLinkMinimumConfidence,
  CONTEXTUAL_LINK_TYPE_LIMITS,
  createLinkPlanDiagnostics,
  MAX_CONTEXTUAL_LINKS,
  recordAcceptedLink,
  recordLinkPlanRejection,
  type ArticleContextualLink,
  type ArticleLinkTarget,
  type ArticleLinkType,
} from '@/lib/article-linking';
import type { DigestContent, DigestContextualLink } from '@/lib/digests';
import { clampScore } from '@/lib/scores';

export type DigestLinkPlanItem = {
  section_index: number;
  paragraph_index: number;
  anchor_text: string;
  target_type: ArticleLinkType;
  target_id: string;
  confidence: number;
  rationale: string;
};

const DIGEST_CONTEXTUAL_LINK_TYPE_LIMITS: Record<ArticleLinkType, number> = {
  ...CONTEXTUAL_LINK_TYPE_LIMITS,
  article: 3,
};

export function evaluateDigestLinkPlan(
  digest: Pick<DigestContent, 'sections'>,
  plan: DigestLinkPlanItem[],
  targets: ArticleLinkTarget[],
) {
  const targetMap = new Map(targets.map((target) => [`${target.type}:${target.id}`, target]));
  const typeCounts: Record<ArticleLinkType, number> = { article: 0, topic: 0, tag: 0, course: 0, source: 0 };
  const usedTargets = new Set<string>();
  const accepted: DigestContextualLink[] = [];
  const taxonomyCount = () => typeCounts.topic + typeCounts.tag;
  const diagnostics = createLinkPlanDiagnostics(plan.length);

  for (const proposed of [...plan].sort((a, b) => Number(b.confidence) - Number(a.confidence))) {
    if (accepted.length >= MAX_CONTEXTUAL_LINKS) {
      recordLinkPlanRejection(diagnostics, 'total_limit');
      continue;
    }
    const type = proposed.target_type;
    const confidence = clampScore(proposed.confidence);
    if (confidence < contextualLinkMinimumConfidence(type)) {
      recordLinkPlanRejection(diagnostics, 'below_confidence');
      continue;
    }
    if (typeCounts[type] >= DIGEST_CONTEXTUAL_LINK_TYPE_LIMITS[type]) {
      recordLinkPlanRejection(diagnostics, 'type_limit');
      continue;
    }
    if ((type === 'topic' || type === 'tag') && taxonomyCount() >= 1) {
      recordLinkPlanRejection(diagnostics, 'taxonomy_limit');
      continue;
    }

    const sectionIndex = Math.max(0, Math.round(Number(proposed.section_index) || 0));
    const paragraphIndex = Math.max(0, Math.round(Number(proposed.paragraph_index) || 0));
    const paragraph = digest.sections[sectionIndex]?.paragraphs[paragraphIndex];
    const targetKey = `${type}:${proposed.target_id}`;
    const target = targetMap.get(targetKey);
    if (!paragraph) {
      recordLinkPlanRejection(diagnostics, 'location_missing');
      continue;
    }
    if (!target) {
      recordLinkPlanRejection(diagnostics, 'target_missing');
      continue;
    }
    if (usedTargets.has(targetKey)) {
      recordLinkPlanRejection(diagnostics, 'duplicate_target');
      continue;
    }

    const candidate: ArticleContextualLink = {
      type: target.type,
      target_id: target.id,
      href: target.href,
      anchor_text: proposed.anchor_text,
      external: target.external,
      confidence,
      rationale: proposed.rationale,
    };
    const existing = accepted.filter((link) => link.section_index === sectionIndex && link.paragraph_index === paragraphIndex);
    const cleaned = cleanArticleLinks(paragraph, [...existing, candidate]);
    if (cleaned.length === existing.length) {
      recordLinkPlanRejection(diagnostics, 'invalid_anchor');
      continue;
    }
    const link = cleaned.find((item) => item.type === target.type && item.target_id === target.id);
    if (!link) {
      recordLinkPlanRejection(diagnostics, 'invalid_anchor');
      continue;
    }

    accepted.push({ ...link, section_index: sectionIndex, paragraph_index: paragraphIndex });
    usedTargets.add(targetKey);
    typeCounts[type] += 1;
    recordAcceptedLink(diagnostics, type);
  }

  return {
    links: accepted.sort((a, b) => a.section_index - b.section_index || a.paragraph_index - b.paragraph_index),
    diagnostics,
  };
}
