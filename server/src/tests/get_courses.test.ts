import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type Course } from '../schema';
import { getCourses } from '../handlers/get_courses';
import { eq } from 'drizzle-orm';

const testCourse1 = {
  title: 'JavaScript Fundamentals',
  description: 'Learn the basics of JavaScript programming',
  difficulty_level: 'beginner' as const,
  estimated_duration_hours: 8.5,
  thumbnail_url: 'https://example.com/js-thumb.jpg',
  is_published: true,
  order_index: 1,
};

const testCourse2 = {
  title: 'React Development',
  description: 'Build modern web applications with React',
  difficulty_level: 'intermediate' as const,
  estimated_duration_hours: 16.0,
  thumbnail_url: null,
  is_published: true,
  order_index: 2,
};

const unpublishedCourse = {
  title: 'Advanced Node.js',
  description: 'Master server-side JavaScript',
  difficulty_level: 'advanced' as const,
  estimated_duration_hours: 24.5,
  thumbnail_url: null,
  is_published: false,
  order_index: 3,
};

describe('getCourses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no published courses exist', async () => {
    const result = await getCourses();
    
    expect(result).toEqual([]);
  });

  it('should fetch all published courses', async () => {
    // Insert test courses
    await db.insert(coursesTable).values([
      testCourse1,
      testCourse2
    ]).execute();

    const result = await getCourses();

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('JavaScript Fundamentals');
    expect(result[1].title).toEqual('React Development');
    expect(result[0].is_published).toBe(true);
    expect(result[1].is_published).toBe(true);
  });

  it('should exclude unpublished courses', async () => {
    // Insert both published and unpublished courses
    await db.insert(coursesTable).values([
      testCourse1,
      unpublishedCourse
    ]).execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('JavaScript Fundamentals');
    expect(result[0].is_published).toBe(true);
  });

  it('should order courses by order_index ascending', async () => {
    // Insert courses in different order than their order_index
    await db.insert(coursesTable).values([
      testCourse2, // order_index: 2
      testCourse1  // order_index: 1
    ]).execute();

    const result = await getCourses();

    expect(result).toHaveLength(2);
    // Should be ordered by order_index (1, 2) not insertion order
    expect(result[0].order_index).toBe(1);
    expect(result[0].title).toEqual('JavaScript Fundamentals');
    expect(result[1].order_index).toBe(2);
    expect(result[1].title).toEqual('React Development');
  });

  it('should include all course fields', async () => {
    await db.insert(coursesTable).values(testCourse1).execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    const course = result[0];
    
    // Verify all required fields are present
    expect(course.id).toBeDefined();
    expect(typeof course.id).toBe('number');
    expect(course.title).toEqual('JavaScript Fundamentals');
    expect(course.description).toEqual('Learn the basics of JavaScript programming');
    expect(course.difficulty_level).toEqual('beginner');
    expect(course.estimated_duration_hours).toEqual(8.5);
    expect(typeof course.estimated_duration_hours).toBe('number');
    expect(course.thumbnail_url).toEqual('https://example.com/js-thumb.jpg');
    expect(course.is_published).toBe(true);
    expect(course.order_index).toBe(1);
    expect(course.created_at).toBeInstanceOf(Date);
    expect(course.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null thumbnail_url correctly', async () => {
    await db.insert(coursesTable).values(testCourse2).execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    expect(result[0].thumbnail_url).toBeNull();
  });

  it('should save courses to database correctly', async () => {
    await db.insert(coursesTable).values([
      testCourse1,
      testCourse2
    ]).execute();

    // Verify courses were saved to database
    const dbCourses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.is_published, true))
      .execute();

    expect(dbCourses).toHaveLength(2);
    expect(dbCourses[0].title).toEqual('JavaScript Fundamentals');
    expect(dbCourses[0].estimated_duration_hours).toEqual(8.5);
    expect(dbCourses[1].title).toEqual('React Development');
    expect(dbCourses[1].estimated_duration_hours).toEqual(16.0);
  });
});