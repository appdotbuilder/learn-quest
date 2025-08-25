import { db } from '../db';
import { lessonsTable } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { type Lesson } from '../schema';

export async function getLessonsByCourse(courseId: number): Promise<Lesson[]> {
  try {
    // Fetch all published lessons for the specified course, ordered by order_index
    const results = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, courseId))
      .orderBy(asc(lessonsTable.order_index))
      .execute();

    // Filter and return published lessons only
    return results.filter(lesson => lesson.is_published);
  } catch (error) {
    console.error('Failed to fetch lessons for course:', error);
    throw error;
  }
}