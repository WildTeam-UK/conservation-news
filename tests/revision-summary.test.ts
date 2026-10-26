import assert from 'node:assert/strict';
import test from 'node:test';
import { revisionChangesPublicContent } from '@/lib/openai/generate-editorial-revision';
import { cleanRevisionSummary, publicArticleContent } from '@/lib/openai/generate-revision-summary';
import type { StoryDraftContent } from '@/lib/openai/draft-story';

const content = {
  template_version: 2,
  topics: ['Wildlife Protection'],
  headline: 'Elephant protection faces renewed scrutiny',
  standfirst: 'New reporting has added detail to the case.',
  story_at_a_glance: [{ text: 'The case prompted renewed scrutiny.', source_ids: ['source-1'] }],
  key_takeaways: [{ text: 'Officials announced a review.', source_ids: ['source-1'] }],
  why_it_matters: { text: 'The case raises questions about elephant protection.', source_ids: ['source-1'] },
  what_happens_next: { text: 'The review is expected to report later.', source_ids: ['source-1'] },
  what_we_know: [{ text: 'An investigation is under way.', source_ids: ['source-1'] }],
  what_we_dont_know: [{ text: 'Its outcome is not yet known.', source_ids: ['source-1'] }],
  coverage_analysis: { ecological: 70, evidence: 70, consensus: 60 },
  image_url: 'https://example.com/image.jpg',
  image_alt: 'An elephant',
  image_search_query: 'elephant conservation',
  image_search_fallbacks: [],
  image_credit: null,
  seo_title: 'Elephant protection scrutiny',
  seo_description: 'A conservation briefing.',
} satisfies StoryDraftContent;

void test('compacts revision evidence to public article copy', () => {
  const compact = publicArticleContent(content);
  assert.equal(compact.headline, content.headline);
  assert.deepEqual(compact.what_we_know, ['An investigation is under way.']);
  assert.equal('image_url' in compact, false);
  assert.equal(compact.key_takeaways[0], 'Officials announced a review.');
});

void test('cleans house-style punctuation and rejects unsupported formatting', () => {
  assert.equal(cleanRevisionSummary('This article now includes new reporting — and clarifies what remains unknown.'), 'This article now includes new reporting, and clarifies what remains unknown.');
  assert.throws(() => cleanRevisionSummary('Too short.'));
  assert.throws(() => cleanRevisionSummary('Read **the updated account** at https://example.com for the latest details.'));
});

void test('distinguishes public copy changes from source-reference changes', () => {
  const sourceOnly = structuredClone(content);
  sourceOnly.key_takeaways[0].source_ids.push('source-2');
  assert.equal(revisionChangesPublicContent(content, sourceOnly), false);

  const editorialUpdate = structuredClone(content);
  editorialUpdate.key_takeaways[0].text = 'Officials announced a wider review of elephant protection.';
  assert.equal(revisionChangesPublicContent(content, editorialUpdate), true);
});
