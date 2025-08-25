import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, lessonsTable } from '../db/schema';
import { getLessonById } from '../handlers/get_lesson_by_id';

describe('getLessonById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a published lesson by ID', async () => {
    // Create prerequisite course
    const courseResults = await db.insert(coursesTable)
      .values({
        title: 'JavaScript Fundamentals',
        description: 'Learn the basics of JavaScript programming',
        difficulty_level: 'beginner',
        estimated_duration_hours: 10,
        is_published: true,
        order_index: 1,
      })
      .returning()
      .execute();

    const courseId = courseResults[0].id;

    // Create published lesson
    const lessonResults = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Variables and Data Types',
        content: 'Learn about JavaScript variables and basic data types...',
        code_template: 'let message = "Hello, World!";\nconsole.log(message);',
        programming_language: 'javascript',
        xp_reward: 15,
        order_index: 1,
        is_published: true,
      })
      .returning()
      .execute();

    const lessonId = lessonResults[0].id;

    // Test the handler
    const result = await getLessonById(lessonId);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(lessonId);
    expect(result?.course_id).toEqual(courseId);
    expect(result?.title).toEqual('Variables and Data Types');
    expect(result?.content).toEqual('Learn about JavaScript variables and basic data types...');
    expect(result?.code_template).toEqual('let message = "Hello, World!";\nconsole.log(message);');
    expect(result?.programming_language).toEqual('javascript');
    expect(result?.xp_reward).toEqual(15);
    expect(result?.order_index).toEqual(1);
    expect(result?.is_published).toBe(true);
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for unpublished lesson', async () => {
    // Create prerequisite course
    const courseResults = await db.insert(coursesTable)
      .values({
        title: 'JavaScript Fundamentals',
        description: 'Learn the basics of JavaScript programming',
        difficulty_level: 'beginner',
        estimated_duration_hours: 10,
        is_published: true,
        order_index: 1,
      })
      .returning()
      .execute();

    const courseId = courseResults[0].id;

    // Create unpublished lesson
    const lessonResults = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Variables and Data Types',
        content: 'Learn about JavaScript variables and basic data types...',
        code_template: 'let message = "Hello, World!";\nconsole.log(message);',
        programming_language: 'javascript',
        xp_reward: 15,
        order_index: 1,
        is_published: false, // Not published
      })
      .returning()
      .execute();

    const lessonId = lessonResults[0].id;

    // Test the handler
    const result = await getLessonById(lessonId);

    expect(result).toBeNull();
  });

  it('should return null for non-existent lesson', async () => {
    // Test with ID that doesn't exist
    const result = await getLessonById(999);

    expect(result).toBeNull();
  });

  it('should handle lesson with nullable fields', async () => {
    // Create prerequisite course
    const courseResults = await db.insert(coursesTable)
      .values({
        title: 'JavaScript Fundamentals',
        description: 'Learn the basics of JavaScript programming',
        difficulty_level: 'beginner',
        estimated_duration_hours: 10,
        is_published: true,
        order_index: 1,
      })
      .returning()
      .execute();

    const courseId = courseResults[0].id;

    // Create lesson with nullable fields as null
    const lessonResults = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Theory Lesson',
        content: 'This is a theory-only lesson with no code',
        code_template: null, // Nullable field
        programming_language: null, // Nullable field
        xp_reward: 5,
        order_index: 2,
        is_published: true,
      })
      .returning()
      .execute();

    const lessonId = lessonResults[0].id;

    // Test the handler
    const result = await getLessonById(lessonId);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(lessonId);
    expect(result?.title).toEqual('Theory Lesson');
    expect(result?.code_template).toBeNull();
    expect(result?.programming_language).toBeNull();
    expect(result?.xp_reward).toEqual(5);
    expect(result?.is_published).toBe(true);
  });

  it('should handle lessons with different programming languages', async () => {
    // Create prerequisite course
    const courseResults = await db.insert(coursesTable)
      .values({
        title: 'Python Basics',
        description: 'Learn Python programming',
        difficulty_level: 'beginner',
        estimated_duration_hours: 8,
        is_published: true,
        order_index: 2,
      })
      .returning()
      .execute();

    const courseId = courseResults[0].id;

    // Create Python lesson
    const lessonResults = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Python Variables',
        content: 'Learn about Python variables and data types',
        code_template: 'message = "Hello, Python!"\nprint(message)',
        programming_language: 'python',
        xp_reward: 20,
        order_index: 1,
        is_published: true,
      })
      .returning()
      .execute();

    const lessonId = lessonResults[0].id;

    // Test the handler
    const result = await getLessonById(lessonId);

    expect(result).not.toBeNull();
    expect(result?.title).toEqual('Python Variables');
    expect(result?.programming_language).toEqual('python');
    expect(result?.code_template).toContain('print(message)');
    expect(result?.xp_reward).toEqual(20);
  });
});