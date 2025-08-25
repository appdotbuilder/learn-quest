import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type Course } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getCourseById = async (courseId: number): Promise<Course | null> => {
  try {
    // Query for the course by ID, only return if published
    const results = await db.select()
      .from(coursesTable)
      .where(and(
        eq(coursesTable.id, courseId),
        eq(coursesTable.is_published, true)
      ))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const course = results[0];
    
    // Return the course directly - estimated_duration_hours is already a number from real column
    return course;
  } catch (error) {
    console.error('Failed to get course by ID:', error);
    throw error;
  }
};