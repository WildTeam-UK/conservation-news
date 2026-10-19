import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { TrainingCourseManager, type TrainingCourse } from '@/components/training-course-manager';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Training courses | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

export default async function TrainingCoursesPage() {
  const { supabase } = await requireContentAdmin();
  const { data, error } = await supabase.from('training_courses').select('id, title, short_title, slug, description, course_url, primary_colour, ad_headline, ad_description, cta_label, matching_guidance, matching_terms, active, display_order, updated_at').order('display_order').order('title');
  if (error) throw new Error('Unable to load the training catalogue. Run the training courses migration first.');
  const courses = (data ?? []) as TrainingCourse[];

  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="training" subview="courses" />
    <div className="admin-shell admin-training-shell">
      <section className="taxonomy-heading">
        <div><p className="eyebrow">Controlled recommendations</p><h1>Training courses</h1><p>Manage the approved WildTeam courses the editorial system can recommend. Matching guidance helps AI choose relevant courses without inventing links or offers.</p></div>
        <div className="taxonomy-summary"><span><GraduationCap /></span><strong>{courses.filter((course) => course.active).length}</strong><small>active courses</small></div>
      </section>
      <TrainingCourseManager initialCourses={courses} />
    </div>
  </main>;
}
