import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, lessonsTable } from '../db/schema';
import { getLessonsByCourse } from '../handlers/get_lessons_by_course';
import { eq } from 'drizzle-orm';

describe('getLessonsByCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return published lessons for a course ordered by order_index', async () => {
    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        difficulty_level: 'beginner',
        estimated_duration_hours: 10.5,
        order_index: 1,
        is_published: true
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create test lessons with different order_index values
    await db.insert(lessonsTable)
      .values([
        {
          course_id: courseId,
          title: 'Lesson 3',
          content: 'Third lesson content',
          code_template: 'console.log("lesson 3");',
          programming_language: 'javascript',
          xp_reward: 30,
          order_index: 3,
          is_published: true
        },
        {
          course_id: courseId,
          title: 'Lesson 1',
          content: 'First lesson content',
          code_template: 'console.log("lesson 1");',
          programming_language: 'javascript',
          xp_reward: 10,
          order_index: 1,
          is_published: true
        },
        {
          course_id: courseId,
          title: 'Lesson 2',
          content: 'Second lesson content',
          code_template: null,
          programming_language: null,
          xp_reward: 20,
          order_index: 2,
          is_published: true
        }
      ])
      .execute();

    const result = await getLessonsByCourse(courseId);

    // Should return lessons ordered by order_index
    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Lesson 1');
    expect(result[0].order_index).toEqual(1);
    expect(result[0].xp_reward).toEqual(10);
    expect(result[0].code_template).toEqual('console.log("lesson 1");');
    expect(result[0].programming_language).toEqual('javascript');

    expect(result[1].title).toEqual('Lesson 2');
    expect(result[1].order_index).toEqual(2);
    expect(result[1].xp_reward).toEqual(20);
    expect(result[1].code_template).toBeNull();
    expect(result[1].programming_language).toBeNull();

    expect(result[2].title).toEqual('Lesson 3');
    expect(result[2].order_index).toEqual(3);
    expect(result[2].xp_reward).toEqual(30);

    // Verify all lessons have required fields
    result.forEach(lesson => {
      expect(lesson.id).toBeDefined();
      expect(lesson.course_id).toEqual(courseId);
      expect(lesson.title).toBeDefined();
      expect(lesson.content).toBeDefined();
      expect(lesson.is_published).toBe(true);
      expect(lesson.created_at).toBeInstanceOf(Date);
      expect(lesson.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should only return published lessons', async () => {
    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        difficulty_level: 'beginner',
        estimated_duration_hours: 10.0,
        order_index: 1,
        is_published: true
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create mix of published and unpublished lessons
    await db.insert(lessonsTable)
      .values([
        {
          course_id: courseId,
          title: 'Published Lesson',
          content: 'Published content',
          xp_reward: 10,
          order_index: 1,
          is_published: true
        },
        {
          course_id: courseId,
          title: 'Unpublished Lesson',
          content: 'Unpublished content',
          xp_reward: 15,
          order_index: 2,
          is_published: false
        },
        {
          course_id: courseId,
          title: 'Another Published Lesson',
          content: 'More published content',
          xp_reward: 20,
          order_index: 3,
          is_published: true
        }
      ])
      .execute();

    const result = await getLessonsByCourse(courseId);

    // Should only return published lessons
    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Published Lesson');
    expect(result[0].is_published).toBe(true);
    expect(result[1].title).toEqual('Another Published Lesson');
    expect(result[1].is_published).toBe(true);

    // Verify unpublished lesson is not returned
    const unpublishedLessonFound = result.some(lesson => lesson.title === 'Unpublished Lesson');
    expect(unpublishedLessonFound).toBe(false);
  });

  it('should return empty array when course has no published lessons', async () => {
    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Empty Course',
        description: 'A course with no published lessons',
        difficulty_level: 'intermediate',
        estimated_duration_hours: 5.0,
        order_index: 1,
        is_published: true
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create only unpublished lessons
    await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Draft Lesson',
        content: 'Draft content',
        xp_reward: 10,
        order_index: 1,
        is_published: false
      })
      .execute();

    const result = await getLessonsByCourse(courseId);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when course does not exist', async () => {
    const nonExistentCourseId = 99999;
    
    const result = await getLessonsByCourse(nonExistentCourseId);

    expect(result).toHaveLength(0);
  });

  it('should handle course with no lessons at all', async () => {
    // Create test course but no lessons
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Course Without Lessons',
        description: 'A course with no lessons',
        difficulty_level: 'advanced',
        estimated_duration_hours: 2.5,
        order_index: 1,
        is_published: true
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    const result = await getLessonsByCourse(courseId);

    expect(result).toHaveLength(0);
  });

  it('should verify lessons are saved correctly in database', async () => {
    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Database Test Course',
        description: 'Testing database storage',
        difficulty_level: 'beginner',
        estimated_duration_hours: 8.0,
        order_index: 1,
        is_published: true
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create test lesson
    const testLesson = {
      course_id: courseId,
      title: 'Database Test Lesson',
      content: 'Testing database lesson storage',
      code_template: 'const test = "database";',
      programming_language: 'javascript',
      xp_reward: 25,
      order_index: 1,
      is_published: true
    };

    await db.insert(lessonsTable)
      .values(testLesson)
      .execute();

    const result = await getLessonsByCourse(courseId);

    // Verify lesson was returned correctly
    expect(result).toHaveLength(1);
    const lesson = result[0];
    expect(lesson.title).toEqual(testLesson.title);
    expect(lesson.content).toEqual(testLesson.content);
    expect(lesson.code_template).toEqual(testLesson.code_template);
    expect(lesson.programming_language).toEqual(testLesson.programming_language);
    expect(lesson.xp_reward).toEqual(testLesson.xp_reward);
    expect(lesson.order_index).toEqual(testLesson.order_index);
    expect(lesson.is_published).toEqual(testLesson.is_published);

    // Verify lesson exists in database
    const dbLessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, courseId))
      .execute();

    expect(dbLessons).toHaveLength(1);
    expect(dbLessons[0].title).toEqual(testLesson.title);
    expect(dbLessons[0].created_at).toBeInstanceOf(Date);
    expect(dbLessons[0].updated_at).toBeInstanceOf(Date);
  });
});