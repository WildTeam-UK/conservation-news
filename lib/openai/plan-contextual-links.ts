import type { StoryDraftContent } from '@/lib/openai/draft-story';
import type { DigestContent } from '@/lib/digests';
import type { ArticleLinkPlanItem, ArticleLinkTarget } from '@/lib/article-linking';
import type { DigestLinkPlanItem } from '@/lib/digest-linking';
import { estimateLunaTokenCost } from '@/lib/openai/pricing';
import { aiInstructions, parseAiJson } from '@/lib/openai/house-style';
import { getOpenAIClient } from '@/lib/openai/client';

const MODEL = 'gpt-6-luna';
export const CONTEXTUAL_LINK_PROMPT_VERSION = 'contextual-links-v2-dedicated';

export type ContextualLinkPlanResult<T> = {
  plan: T[];
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

const targetSchema = {
  type: 'object',
  properties: {
    section: { type: 'string', enum: ['key_takeaways', 'why_it_matters', 'what_happens_next', 'what_we_know', 'what_we_dont_know'] },
    item_index: { type: 'integer', minimum: 0, maximum: 5 },
    anchor_text: { type: 'string' },
    target_type: { type: 'string', enum: ['article', 'topic', 'tag', 'course', 'source'] },
    target_id: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    rationale: { type: 'string' },
  },
  required: ['section', 'item_index', 'anchor_text', 'target_type', 'target_id', 'confidence', 'rationale'],
  additionalProperties: false,
} as const;

const digestTargetSchema = {
  type: 'object',
  properties: {
    section_index: { type: 'integer', minimum: 0, maximum: 5 },
    paragraph_index: { type: 'integer', minimum: 0, maximum: 3 },
    anchor_text: { type: 'string' },
    target_type: { type: 'string', enum: ['article', 'topic', 'tag', 'course', 'source'] },
    target_id: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    rationale: { type: 'string' },
  },
  required: ['section_index', 'paragraph_index', 'anchor_text', 'target_type', 'target_id', 'confidence', 'rationale'],
  additionalProperties: false,
} as const;

function approvedTargets(targets: ArticleLinkTarget[]) {
  return targets.map((target) => ({ id: target.id, type: target.type, title: target.title, description: target.description }));
}

function result<T>(response: { usage?: { input_tokens?: number; output_tokens?: number } | null }, plan: T[]): ContextualLinkPlanResult<T> {
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  return { plan, inputTokens, outputTokens, estimatedCostUsd: estimateLunaTokenCost(inputTokens, outputTokens) };
}

export async function planArticleContextualLinks(content: StoryDraftContent, targets: ArticleLinkTarget[]): Promise<ContextualLinkPlanResult<ArticleLinkPlanItem>> {
  if (!targets.length) return { plan: [], inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
  const response = await getOpenAIClient().responses.create({
    model: MODEL,
    store: false,
    reasoning: { effort: 'medium' },
    instructions: aiInstructions(`You are the contextual-link editor for WildNews. The article copy is final and must not be rewritten.

Review the finished article and approved link targets. Return only natural, useful links whose anchor text already appears exactly in the specified article item. The anchor must be a complete word or naturally descriptive phrase, never part of a longer word. Do not use generic anchors such as "click here", "read more", "learn more", "this article", "this story", "website" or "source".

Aim for two to four links when the finished copy genuinely supports them. Do not force a minimum, but do not return an empty plan merely because topic pills, source citations or a course advert exist elsewhere on the page. Look carefully for meaningful opportunities.

Prioritise a directly relevant WildNews article, followed by a useful topic or approved live-tag archive. Recommend a course only where the existing wording discusses a skill that course teaches, with confidence of at least 85. Link an external source only when direct access to the first-hand evidence is materially useful; routine source access is already provided by citations and the source list.

Choose no more than two article links, one topic or live-tag link in total, one course link and one named external source link, with no more than five links overall. Never repeat a destination. Distribute links rather than clustering them in one item. Do not link the headline, standfirst or story-at-a-glance introduction. It is acceptable to return fewer than two links when the approved targets are not genuinely relevant.`),
    input: JSON.stringify({
      article: {
        key_takeaways: content.key_takeaways.map((item) => item.text),
        why_it_matters: content.why_it_matters.text,
        what_happens_next: content.what_happens_next.text,
        what_we_know: content.what_we_know.map((item) => item.text),
        what_we_dont_know: content.what_we_dont_know.map((item) => item.text),
      },
      approved_link_targets: approvedTargets(targets),
    }),
    text: { format: {
      type: 'json_schema',
      name: 'wildnews_article_contextual_links',
      strict: true,
      schema: {
        type: 'object',
        properties: { link_plan: { type: 'array', maxItems: 5, items: targetSchema } },
        required: ['link_plan'],
        additionalProperties: false,
      },
    } },
  });
  if (!response.output_text) throw new Error('OpenAI returned no article link plan.');
  const parsed = parseAiJson<{ link_plan: ArticleLinkPlanItem[] }>(response.output_text);
  return result(response, parsed.link_plan ?? []);
}

export async function planDigestContextualLinks(content: DigestContent, targets: ArticleLinkTarget[]): Promise<ContextualLinkPlanResult<DigestLinkPlanItem>> {
  if (!targets.length) return { plan: [], inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
  const response = await getOpenAIClient().responses.create({
    model: MODEL,
    store: false,
    reasoning: { effort: 'medium' },
    instructions: aiInstructions(`You are the contextual-link editor for a WildNews digest. The digest copy is final and must not be rewritten.

Review the finished digest sections and approved link targets. Return only natural, useful links whose anchor text already appears exactly in the specified paragraph. The anchor must be a complete word or naturally descriptive phrase, never part of a longer word. Do not use generic anchors such as "click here", "read more", "learn more", "this article", "this story", "website" or "source".

Aim for three to five links across the full digest when the finished copy genuinely supports them. Where the text discusses their subject directly, prefer two or three of the specific WildNews stories used in the edition and spread them across different sections. Then consider one useful topic or approved live-tag archive. Recommend a course only where the existing wording discusses a skill that course teaches, with confidence of at least 85. Link an external source only when direct access to first-hand evidence is materially useful.

Do not force a minimum, but do not return an empty plan merely because the digest has topic pills or a source-article list at the bottom. Choose no more than three article links, one topic or live-tag link in total, one course link and one named external source link, with no more than five links overall. Never repeat a destination or link the same wording twice in one paragraph. Do not link the introduction, headings or standfirst.`),
    input: JSON.stringify({
      sections: content.sections.map((section, sectionIndex) => ({ section_index: sectionIndex, heading: section.heading, paragraphs: section.paragraphs })),
      approved_link_targets: approvedTargets(targets),
    }),
    text: { format: {
      type: 'json_schema',
      name: 'wildnews_digest_contextual_links',
      strict: true,
      schema: {
        type: 'object',
        properties: { link_plan: { type: 'array', maxItems: 5, items: digestTargetSchema } },
        required: ['link_plan'],
        additionalProperties: false,
      },
    } },
  });
  if (!response.output_text) throw new Error('OpenAI returned no digest link plan.');
  const parsed = parseAiJson<{ link_plan: DigestLinkPlanItem[] }>(response.output_text);
  return result(response, parsed.link_plan ?? []);
}
