import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEmailDistributionPayload, buildSocialDistributionPayload } from '../lib/distribution/digest-content';
import type { DigestContent, DigestSourceStory } from '../lib/digests';

const content: DigestContent = {
  template_version: 3,
  digest_type: 'weekly',
  edition_label: 'The week in conservation',
  headline: 'Evidence reshapes conservation choices',
  standfirst: 'A grounded weekly conservation briefing.',
  introduction: ['First overview.', 'Second overview.'],
  sections: [{ heading: 'What changed', paragraphs: ['Supported copy.'], story_ids: ['story-1'] }],
  what_to_watch: ['Further monitoring.'],
  seo_title: 'Evidence reshapes conservation choices',
  seo_description: 'A weekly conservation briefing.',
  email_overview: ['The first email overview paragraph.', 'The second email overview paragraph.'],
  email_sections: [{ heading: 'Why it matters', paragraphs: ['The evidence remains important.'] }],
};

const sources: DigestSourceStory[] = Array.from({ length: 5 }, (_, index) => ({
  id: `story-${index + 1}`,
  slug: `source-story-${index + 1}`,
  headline: `Source story ${index + 1}`,
  standfirst: 'A source-grounded summary.',
  image_url: `https://images.example.org/${index + 1}.jpg`,
  image_alt: 'Conservation fieldwork',
  published_at: `2026-10-${20 + index}T12:00:00.000Z`,
}));

void test('Buffer payload preserves validated copy, canonical URL and publishing mode', () => {
  const payload = buildSocialDistributionPayload({
    deliveryId: 'delivery-1',
    text: '🌿 A grounded social briefing.\n\n📰 Read the latest WildNews daily digest: https://news.wildteam.org.uk/daily-digest/2026-10-26',
    publicUrl: 'https://news.wildteam.org.uk/daily-digest/2026-10-26',
    imageUrl: 'https://images.example.org/digest.jpg',
    mode: 'shareNow',
  });
  assert.equal(payload.mode, 'shareNow');
  assert.equal(payload.publicUrl, 'https://news.wildteam.org.uk/daily-digest/2026-10-26');
  assert.equal(payload.source, 'wildnews-digest-delivery-1');
});

void test('Brevo weekly payload keeps the branded subject and canonical weekly link', () => {
  const payload = buildEmailDistributionPayload({
    runId: 'run-1',
    type: 'weekly',
    editionDate: '2026-10-30',
    content,
    sources,
    imageUrl: 'https://images.example.org/digest.jpg',
    imageAlt: 'A wetland landscape',
    listId: 42,
  });
  assert.equal(payload.subject, 'WildNews Weekly | Evidence reshapes conservation choices');
  assert.equal(payload.publicUrl, 'https://news.wildteam.org.uk/weekly-digest/2026-10-30');
  assert.equal(payload.listId, 42);
  assert.match(payload.htmlContent, /Five stories worth your time/);
  assert.match(payload.htmlContent, /weekly-digest\/2026-10-30/);
});
