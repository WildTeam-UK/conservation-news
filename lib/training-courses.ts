export type TrainingCoursePromotion = {
  id: string;
  title: string;
  short_title: string | null;
  description: string;
  course_url: string;
  primary_colour: string;
  ad_headline: string;
  ad_description: string;
  cta_label: string;
};

export const GENERAL_TRAINING_PROMOTION: TrainingCoursePromotion = {
  id: 'wildteam-training',
  title: 'WildTeam Training',
  short_title: 'Training',
  description: 'Practical conservation training created and taught by working conservation professionals.',
  course_url: 'https://training.wildteam.org.uk/courses',
  primary_colour: '#6e0f6c',
  ad_headline: 'Turn conservation ambition into practical action',
  ad_description: 'Build job-ready skills with flexible courses created and taught by working conservation professionals.',
  cta_label: 'Explore WildTeam Training',
};

function slugifyCourse(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'course';
}

export function trainingCourseValues(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : '';
  const courseUrl = typeof body.courseUrl === 'string' ? body.courseUrl.trim().slice(0, 500) : '';
  const primaryColour = typeof body.primaryColour === 'string' ? body.primaryColour.trim() : '';
  const url = new URL(courseUrl);
  if (!title || !['http:', 'https:'].includes(url.protocol) || !/^#[0-9a-f]{6}$/i.test(primaryColour)) throw new Error('Enter a valid title, course URL and colour.');
  const required = ['description', 'adHeadline', 'adDescription', 'ctaLabel', 'matchingGuidance'] as const;
  const text = Object.fromEntries(required.map((key) => [key, typeof body[key] === 'string' ? body[key].trim() : ''])) as Record<(typeof required)[number], string>;
  if (required.some((key) => !text[key])) throw new Error('Complete all required course fields.');
  return { title, short_title: typeof body.shortTitle === 'string' ? body.shortTitle.trim().slice(0, 80) || null : null, slug: slugifyCourse(title), description: text.description.slice(0, 600), course_url: url.toString(), primary_colour: primaryColour.toLowerCase(), ad_headline: text.adHeadline.slice(0, 160), ad_description: text.adDescription.slice(0, 320), cta_label: text.ctaLabel.slice(0, 60), matching_guidance: text.matchingGuidance.slice(0, 1200), matching_terms: typeof body.matchingTerms === 'string' ? [...new Set(body.matchingTerms.split(',').map((term) => term.trim().slice(0, 80)).filter(Boolean))].slice(0, 40) : [], display_order: Math.max(0, Math.min(999, Number(body.displayOrder) || 0)) };
}
