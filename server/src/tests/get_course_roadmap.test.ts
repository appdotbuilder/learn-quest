import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  coursesTable, 
  coursePrerequisitesTable, 
  userProgressTable,
  usersTable 
} from '../db/schema';
import { getCourseRoadmap } from '../handlers/get_course_roadmap';

describe('getCourseRoadmap', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no courses exist', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        total_xp: 0,
        current_level: 1,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const result = await getCourseRoadmap(userId);
    
    expect(result).toEqual([]);
  });

  it('should return published courses ordered by order_index', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        total_xp: 0,
        current_level: 1,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create courses with different order_index values
    await db.insert(coursesTable)
      .values([
        {
          title: 'Advanced Course',
          description: 'Advanced programming concepts',
          difficulty_level: 'advanced',
          estimated_duration_hours: 20.5,
          is_published: true,
          order_index: 3,
        },
        {
          title: 'Beginner Course',
          description: 'Introduction to programming',
          difficulty_level: 'beginner',
          estimated_duration_hours: 10.0,
          is_published: true,
          order_index: 1,
        },
        {
          title: 'Intermediate Course',
          description: 'Intermediate programming concepts',
          difficulty_level: 'intermediate',
          estimated_duration_hours: 15.5,
          is_published: true,
          order_index: 2,
        },
        {
          title: 'Unpublished Course',
          description: 'This should not appear',
          difficulty_level: 'beginner',
          estimated_duration_hours: 5.0,
          is_published: false,
          order_index: 0,
        },
      ])
      .execute();

    const result = await getCourseRoadmap(userId);

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Beginner Course');
    expect(result[0].order_index).toBe(1);
    expect(result[0].estimated_duration_hours).toBe(10.0);
    expect(typeof result[0].estimated_duration_hours).toBe('number');
    
    expect(result[1].title).toBe('Intermediate Course');
    expect(result[1].order_index).toBe(2);
    expect(result[1].estimated_duration_hours).toBe(15.5);
    
    expect(result[2].title).toBe('Advanced Course');
    expect(result[2].order_index).toBe(3);
    expect(result[2].estimated_duration_hours).toBe(20.5);
  });

  it('should handle courses with prerequisites correctly', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        total_xp: 0,
        current_level: 1,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create courses
    const courseResults = await db.insert(coursesTable)
      .values([
        {
          title: 'JavaScript Basics',
          description: 'Learn JavaScript fundamentals',
          difficulty_level: 'beginner',
          estimated_duration_hours: 8.0,
          is_published: true,
          order_index: 1,
        },
        {
          title: 'React Framework',
          description: 'Learn React development',
          difficulty_level: 'intermediate',
          estimated_duration_hours: 16.0,
          is_published: true,
          order_index: 2,
        },
        {
          title: 'Node.js Backend',
          description: 'Learn server-side development',
          difficulty_level: 'intermediate',
          estimated_duration_hours: 12.0,
          is_published: true,
          order_index: 3,
        },
      ])
      .returning()
      .execute();

    // Set up prerequisites: React requires JavaScript, Node.js requires JavaScript
    await db.insert(coursePrerequisitesTable)
      .values([
        {
          course_id: courseResults[1].id, // React
          prerequisite_course_id: courseResults[0].id, // JavaScript
        },
        {
          course_id: courseResults[2].id, // Node.js
          prerequisite_course_id: courseResults[0].id, // JavaScript
        },
      ])
      .execute();

    const result = await getCourseRoadmap(userId);

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('JavaScript Basics');
    expect(result[1].title).toBe('React Framework');
    expect(result[2].title).toBe('Node.js Backend');
  });

  it('should track user progress correctly', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        total_xp: 100,
        current_level: 2,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create courses
    const courseResults = await db.insert(coursesTable)
      .values([
        {
          title: 'Course A',
          description: 'First course',
          difficulty_level: 'beginner',
          estimated_duration_hours: 5.0,
          is_published: true,
          order_index: 1,
        },
        {
          title: 'Course B',
          description: 'Second course',
          difficulty_level: 'intermediate',
          estimated_duration_hours: 10.0,
          is_published: true,
          order_index: 2,
        },
      ])
      .returning()
      .execute();

    // Mark first course as completed
    await db.insert(userProgressTable)
      .values([
        {
          user_id: userId,
          course_id: courseResults[0].id,
          status: 'completed',
          completion_percentage: 100.0,
          xp_earned: 50,
          started_at: new Date(),
          completed_at: new Date(),
        },
        {
          user_id: userId,
          course_id: courseResults[1].id,
          status: 'in_progress',
          completion_percentage: 30.0,
          xp_earned: 15,
          started_at: new Date(),
        },
      ])
      .execute();

    const result = await getCourseRoadmap(userId);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Course A');
    expect(result[1].title).toBe('Course B');
    
    // Verify numeric conversions are working
    expect(typeof result[0].estimated_duration_hours).toBe('number');
    expect(typeof result[1].estimated_duration_hours).toBe('number');
    expect(result[0].estimated_duration_hours).toBe(5.0);
    expect(result[1].estimated_duration_hours).toBe(10.0);
  });

  it('should handle courses with no prerequisites', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        total_xp: 0,
        current_level: 1,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a single course
    await db.insert(coursesTable)
      .values({
        title: 'Standalone Course',
        description: 'A course with no prerequisites',
        difficulty_level: 'beginner',
        estimated_duration_hours: 6.5,
        is_published: true,
        order_index: 1,
        thumbnail_url: 'https://example.com/thumbnail.jpg',
      })
      .execute();

    const result = await getCourseRoadmap(userId);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Standalone Course');
    expect(result[0].description).toBe('A course with no prerequisites');
    expect(result[0].difficulty_level).toBe('beginner');
    expect(result[0].estimated_duration_hours).toBe(6.5);
    expect(result[0].thumbnail_url).toBe('https://example.com/thumbnail.jpg');
    expect(result[0].is_published).toBe(true);
    expect(result[0].order_index).toBe(1);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });
});