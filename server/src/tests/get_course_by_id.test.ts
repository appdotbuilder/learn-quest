import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable } from '../db/schema';
import { getCourseById } from '../handlers/get_course_by_id';

describe('getCourseById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a published course by ID', async () => {
    // Create a published course
    const courseData = {
      title: 'JavaScript Fundamentals',
      description: 'Learn the basics of JavaScript programming',
      difficulty_level: 'beginner' as const,
      estimated_duration_hours: 8.5,
      thumbnail_url: 'https://example.com/thumbnail.jpg',
      is_published: true,
      order_index: 1
    };

    const insertResult = await db.insert(coursesTable)
      .values(courseData)
      .returning()
      .execute();

    const courseId = insertResult[0].id;

    // Test the handler
    const result = await getCourseById(courseId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(courseId);
    expect(result!.title).toBe('JavaScript Fundamentals');
    expect(result!.description).toBe(courseData.description);
    expect(result!.difficulty_level).toBe('beginner');
    expect(result!.estimated_duration_hours).toBe(8.5);
    expect(typeof result!.estimated_duration_hours).toBe('number');
    expect(result!.thumbnail_url).toBe('https://example.com/thumbnail.jpg');
    expect(result!.is_published).toBe(true);
    expect(result!.order_index).toBe(1);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent course ID', async () => {
    const result = await getCourseById(999999);
    expect(result).toBeNull();
  });

  it('should return null for unpublished course', async () => {
    // Create an unpublished course
    const courseData = {
      title: 'Advanced Python',
      description: 'Deep dive into Python programming',
      difficulty_level: 'advanced' as const,
      estimated_duration_hours: 12.0,
      thumbnail_url: null,
      is_published: false,
      order_index: 2
    };

    const insertResult = await db.insert(coursesTable)
      .values(courseData)
      .returning()
      .execute();

    const courseId = insertResult[0].id;

    // Test the handler - should return null because course is not published
    const result = await getCourseById(courseId);
    expect(result).toBeNull();
  });

  it('should handle course with null thumbnail_url', async () => {
    // Create course with null thumbnail
    const courseData = {
      title: 'React Basics',
      description: 'Introduction to React components',
      difficulty_level: 'intermediate' as const,
      estimated_duration_hours: 6.0,
      thumbnail_url: null,
      is_published: true,
      order_index: 3
    };

    const insertResult = await db.insert(coursesTable)
      .values(courseData)
      .returning()
      .execute();

    const courseId = insertResult[0].id;

    const result = await getCourseById(courseId);

    expect(result).not.toBeNull();
    expect(result!.thumbnail_url).toBeNull();
    expect(result!.title).toBe('React Basics');
    expect(result!.is_published).toBe(true);
  });

  it('should handle different difficulty levels correctly', async () => {
    // Test each difficulty level
    const difficulties = ['beginner', 'intermediate', 'advanced'] as const;

    for (const difficulty of difficulties) {
      const courseData = {
        title: `${difficulty} Course`,
        description: `A ${difficulty} level course`,
        difficulty_level: difficulty,
        estimated_duration_hours: 5.5,
        thumbnail_url: null,
        is_published: true,
        order_index: 0
      };

      const insertResult = await db.insert(coursesTable)
        .values(courseData)
        .returning()
        .execute();

      const courseId = insertResult[0].id;
      const result = await getCourseById(courseId);

      expect(result).not.toBeNull();
      expect(result!.difficulty_level).toBe(difficulty);
      expect(result!.title).toBe(`${difficulty} Course`);
    }
  });

  it('should verify database query with multiple published courses', async () => {
    // Create multiple courses, only one should be returned
    const coursesData = [
      {
        title: 'Course 1',
        description: 'First course',
        difficulty_level: 'beginner' as const,
        estimated_duration_hours: 4.0,
        thumbnail_url: null,
        is_published: true,
        order_index: 1
      },
      {
        title: 'Course 2', 
        description: 'Second course',
        difficulty_level: 'intermediate' as const,
        estimated_duration_hours: 6.0,
        thumbnail_url: null,
        is_published: true,
        order_index: 2
      }
    ];

    const insertResults = await db.insert(coursesTable)
      .values(coursesData)
      .returning()
      .execute();

    const firstCourseId = insertResults[0].id;
    const secondCourseId = insertResults[1].id;

    // Test first course
    const result1 = await getCourseById(firstCourseId);
    expect(result1).not.toBeNull();
    expect(result1!.id).toBe(firstCourseId);
    expect(result1!.title).toBe('Course 1');

    // Test second course
    const result2 = await getCourseById(secondCourseId);
    expect(result2).not.toBeNull();
    expect(result2!.id).toBe(secondCourseId);
    expect(result2!.title).toBe('Course 2');
  });
});