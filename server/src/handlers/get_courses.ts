import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type Course } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getCourses = async (): Promise<Course[]> => {
  try {
    // Fetch all published courses ordered by order_index
    const results = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.is_published, true))
      .orderBy(asc(coursesTable.order_index))
      .execute();

    // Return results directly - real columns are already numbers
    return results;
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    throw error;
  }
};