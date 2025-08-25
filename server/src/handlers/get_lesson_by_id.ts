import { db } from '../db';
import { lessonsTable } from '../db/schema';
import { type Lesson } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getLessonById(lessonId: number): Promise<Lesson | null> {
  try {
    // Fetch lesson by ID, ensuring it's published
    const results = await db.select()
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.id, lessonId),
          eq(lessonsTable.is_published, true)
        )
      )
      .execute();

    if (results.length === 0) {
      return null;
    }

    const lesson = results[0];

    // Return lesson data - no numeric conversions needed for lessons table
    return lesson;
  } catch (error) {
    console.error('Failed to get lesson by ID:', error);
    throw error;
  }
}