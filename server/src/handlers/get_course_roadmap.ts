import { db } from '../db';
import { coursesTable, coursePrerequisitesTable, userProgressTable } from '../db/schema';
import { type Course } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export const getCourseRoadmap = async (userId: number): Promise<Course[]> => {
  try {
    // First, get all published courses with their order
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.is_published, true))
      .orderBy(asc(coursesTable.order_index), asc(coursesTable.id))
      .execute();

    // Get all course prerequisites
    const prerequisites = await db.select()
      .from(coursePrerequisitesTable)
      .execute();

    // Get user's completed courses
    const userProgress = await db.select()
      .from(userProgressTable)
      .where(
        and(
          eq(userProgressTable.user_id, userId),
          eq(userProgressTable.status, 'completed')
        )
      )
      .execute();

    const completedCourseIds = new Set(
      userProgress.map(progress => progress.course_id)
    );

    // Create a map of course prerequisites for efficient lookup
    const coursePrerequisites = new Map<number, number[]>();
    prerequisites.forEach(prereq => {
      const courseId = prereq.course_id;
      const prerequisiteId = prereq.prerequisite_course_id;
      
      if (!coursePrerequisites.has(courseId)) {
        coursePrerequisites.set(courseId, []);
      }
      coursePrerequisites.get(courseId)!.push(prerequisiteId);
    });

    // Convert courses to the expected format, applying numeric conversions
    return courses.map(course => ({
      ...course,
      estimated_duration_hours: parseFloat(course.estimated_duration_hours.toString())
    }));

  } catch (error) {
    console.error('Failed to get course roadmap:', error);
    throw error;
  }
};