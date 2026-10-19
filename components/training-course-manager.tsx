'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, GraduationCap, LoaderCircle, Plus, Save } from 'lucide-react';

export type TrainingCourse = {
  id: string;
  title: string;
  short_title: string | null;
  slug: string;
  description: string;
  course_url: string;
  primary_colour: string;
  ad_headline: string;
  ad_description: string;
  cta_label: string;
  matching_guidance: string;
  matching_terms: string[];
  active: boolean;
  display_order: number;
  updated_at: string;
};

type CourseFields = {
  title: string;
  shortTitle: string;
  description: string;
  courseUrl: string;
  primaryColour: string;
  adHeadline: string;
  adDescription: string;
  ctaLabel: string;
  matchingGuidance: string;
  matchingTerms: string;
  displayOrder: number;
};

const blankCourse: CourseFields = { title: '', shortTitle: '', description: '', courseUrl: '', primaryColour: '#6e0f6c', adHeadline: '', adDescription: '', ctaLabel: 'Explore the course', matchingGuidance: '', matchingTerms: '', displayOrder: 0 };

function fieldsFor(course: TrainingCourse): CourseFields {
  return { title: course.title, shortTitle: course.short_title ?? '', description: course.description, courseUrl: course.course_url, primaryColour: course.primary_colour, adHeadline: course.ad_headline, adDescription: course.ad_description, ctaLabel: course.cta_label, matchingGuidance: course.matching_guidance, matchingTerms: course.matching_terms.join(', '), displayOrder: course.display_order };
}

function CourseFieldsForm({ fields, setFields }: { fields: CourseFields; setFields: (fields: CourseFields) => void }) {
  const update = <K extends keyof CourseFields>(key: K, value: CourseFields[K]) => setFields({ ...fields, [key]: value });
  return <div className="training-course-fields">
    <label><span>Course title</span><input value={fields.title} onChange={(event) => update('title', event.target.value)} maxLength={160} required /></label>
    <label><span>Short display title</span><input value={fields.shortTitle} onChange={(event) => update('shortTitle', event.target.value)} maxLength={80} placeholder="Optional" /></label>
    <label className="training-field-wide"><span>Course description</span><textarea rows={3} value={fields.description} onChange={(event) => update('description', event.target.value)} maxLength={600} required /></label>
    <label className="training-field-wide"><span>Course URL</span><input type="url" value={fields.courseUrl} onChange={(event) => update('courseUrl', event.target.value)} placeholder="https://training.wildteam.org.uk/..." required /></label>
    <label><span>Main colour</span><div className="training-colour-field"><input type="color" value={fields.primaryColour} onChange={(event) => update('primaryColour', event.target.value)} /><input value={fields.primaryColour} onChange={(event) => update('primaryColour', event.target.value)} pattern="#[0-9a-fA-F]{6}" maxLength={7} required /></div></label>
    <label><span>Display order</span><input type="number" min="0" max="999" value={fields.displayOrder} onChange={(event) => update('displayOrder', Number(event.target.value))} required /></label>
    <label className="training-field-wide"><span>Advert headline</span><input value={fields.adHeadline} onChange={(event) => update('adHeadline', event.target.value)} maxLength={160} placeholder="Build the skills to…" required /></label>
    <label className="training-field-wide"><span>Advert description</span><textarea rows={2} value={fields.adDescription} onChange={(event) => update('adDescription', event.target.value)} maxLength={320} required /></label>
    <label><span>CTA label</span><input value={fields.ctaLabel} onChange={(event) => update('ctaLabel', event.target.value)} maxLength={60} required /></label>
    <label><span>Matching terms</span><input value={fields.matchingTerms} onChange={(event) => update('matchingTerms', event.target.value)} placeholder="monitoring, evaluation, impact" /><small>Comma-separated clues, not rigid rules.</small></label>
    <label className="training-field-wide"><span>AI matching guidance</span><textarea rows={4} value={fields.matchingGuidance} onChange={(event) => update('matchingGuidance', event.target.value)} maxLength={1200} placeholder="Recommend this course when an article discusses… Avoid it when…" required /></label>
  </div>;
}

function CourseCard({ course }: { course: TrainingCourse }) {
  const router = useRouter();
  const [fields, setFields] = useState(() => fieldsFor(course));
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function update(action: 'update' | 'toggle', event?: SyntheticEvent<HTMLFormElement>) {
    event?.preventDefault(); setWorking(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/training-courses/${course.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'toggle' ? { action, active: !course.active } : { action, ...fields }) });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) throw new Error(result.error ?? 'The course could not be saved.');
      setMessage(action === 'toggle' ? (course.active ? 'Course deactivated.' : 'Course activated.') : 'Course saved.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The course could not be saved.'); }
    finally { setWorking(false); }
  }

  return <article className={`training-course-card${course.active ? '' : ' inactive'}`}>
    <div className="training-course-card-heading"><span className="training-course-swatch" style={{ backgroundColor: course.primary_colour }}><GraduationCap /></span><div><p className="eyebrow">{course.active ? 'Active course' : 'Inactive course'}</p><h2>{course.title}</h2><a href={course.course_url} target="_blank" rel="noreferrer">View course <ExternalLink /></a></div><button type="button" disabled={working} onClick={() => update('toggle')}>{course.active ? 'Deactivate' : 'Activate'}</button></div>
    <details><summary>Edit course <ChevronDown /></summary><form onSubmit={(event) => update('update', event)}><CourseFieldsForm fields={fields} setFields={setFields} /><div className="training-course-actions"><button type="submit" disabled={working}>{working ? <LoaderCircle className="admin-spinner" /> : <Save />} Save course</button>{message ? <output>{message}</output> : null}</div></form></details>
  </article>;
}

export function TrainingCourseManager({ initialCourses }: { initialCourses: TrainingCourse[] }) {
  const router = useRouter();
  const [fields, setFields] = useState(blankCourse);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function create(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking(true); setMessage('');
    try {
      const response = await fetch('/api/admin/training-courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) throw new Error(result.error ?? 'The course could not be added.');
      setFields(blankCourse); setMessage('Course added.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The course could not be added.'); }
    finally { setWorking(false); }
  }

  return <section className="training-catalogue">
    <details className="training-course-create"><summary><span><Plus /> Add a course</span><ChevronDown /></summary><form onSubmit={create}><CourseFieldsForm fields={fields} setFields={setFields} /><div className="training-course-actions"><button type="submit" disabled={working}>{working ? <LoaderCircle className="admin-spinner" /> : <Plus />} Add course</button>{message ? <output>{message}</output> : null}</div></form></details>
    {initialCourses.length ? <div className="training-course-list">{initialCourses.map((course) => <CourseCard course={course} key={course.id} />)}</div> : <div className="source-empty"><GraduationCap /><h2>No courses added yet</h2><p>Add the approved WildTeam courses before article recommendations are enabled.</p></div>}
  </section>;
}
