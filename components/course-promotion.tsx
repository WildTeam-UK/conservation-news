import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { TrainingCoursePromotion } from '@/lib/training-courses';

export function CoursePromotion({ course }: { course: TrainingCoursePromotion }) {
  return <aside className="course-promotion" style={{ '--course-colour': course.primary_colour } as CSSProperties}>
    <div className="course-promotion-copy">
      <p className="eyebrow">WildTeam Training</p>
      <h2>{course.ad_headline}</h2>
      {course.id !== 'wildteam-training' ? <p className="course-promotion-course">{course.title}</p> : null}
      <p className="course-promotion-description">{course.ad_description}</p>
    </div>
    <a href={course.course_url} target="_blank" rel="noreferrer">{course.cta_label} <ArrowRight aria-hidden="true" /></a>
  </aside>;
}
