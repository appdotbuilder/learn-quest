import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, lessonsTable, quizQuestionsTable } from '../db/schema';
import { type CreateQuizQuestionInput } from '../schema';
import { getQuizQuestions } from '../handlers/get_quiz_questions';
import { eq } from 'drizzle-orm';

describe('getQuizQuestions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return quiz questions ordered by order_index', async () => {
    // Create course first
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Test course description',
        difficulty_level: 'beginner',
        estimated_duration_hours: 1.5,
        order_index: 1,
      })
      .returning()
      .execute();

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        xp_reward: 10,
        order_index: 1,
      })
      .returning()
      .execute();

    // Create quiz questions with different order_index
    await db.insert(quizQuestionsTable)
      .values([
        {
          lesson_id: lessonResult[0].id,
          question_text: 'Second question?',
          options: ['Option A', 'Option B'],
          correct_answer_index: 0,
          explanation: 'Second explanation',
          order_index: 2,
        },
        {
          lesson_id: lessonResult[0].id,
          question_text: 'First question?',
          options: ['Option 1', 'Option 2', 'Option 3'],
          correct_answer_index: 1,
          explanation: 'First explanation',
          order_index: 1,
        },
        {
          lesson_id: lessonResult[0].id,
          question_text: 'Third question?',
          options: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
          correct_answer_index: 2,
          order_index: 3,
        },
      ])
      .execute();

    const results = await getQuizQuestions(lessonResult[0].id);

    // Should return 3 questions
    expect(results).toHaveLength(3);

    // Should be ordered by order_index
    expect(results[0].question_text).toEqual('First question?');
    expect(results[0].order_index).toEqual(1);
    expect(results[1].question_text).toEqual('Second question?');
    expect(results[1].order_index).toEqual(2);
    expect(results[2].question_text).toEqual('Third question?');
    expect(results[2].order_index).toEqual(3);

    // Should include all fields
    expect(results[0].id).toBeDefined();
    expect(results[0].lesson_id).toEqual(lessonResult[0].id);
    expect(results[0].options).toEqual(['Option 1', 'Option 2', 'Option 3']);
    expect(results[0].correct_answer_index).toEqual(1);
    expect(results[0].explanation).toEqual('First explanation');
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for lesson with no quiz questions', async () => {
    // Create course first
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Test course description',
        difficulty_level: 'beginner',
        estimated_duration_hours: 1.5,
        order_index: 1,
      })
      .returning()
      .execute();

    // Create lesson without quiz questions
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        xp_reward: 10,
        order_index: 1,
      })
      .returning()
      .execute();

    const results = await getQuizQuestions(lessonResult[0].id);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return empty array for non-existent lesson', async () => {
    const results = await getQuizQuestions(99999);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle questions with different option counts', async () => {
    // Create course first
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Test course description',
        difficulty_level: 'beginner',
        estimated_duration_hours: 1.5,
        order_index: 1,
      })
      .returning()
      .execute();

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        xp_reward: 10,
        order_index: 1,
      })
      .returning()
      .execute();

    // Create questions with different numbers of options
    await db.insert(quizQuestionsTable)
      .values([
        {
          lesson_id: lessonResult[0].id,
          question_text: 'True or False?',
          options: ['True', 'False'],
          correct_answer_index: 0,
          order_index: 1,
        },
        {
          lesson_id: lessonResult[0].id,
          question_text: 'Multiple choice?',
          options: ['A', 'B', 'C', 'D', 'E', 'F'],
          correct_answer_index: 2,
          order_index: 2,
        },
      ])
      .execute();

    const results = await getQuizQuestions(lessonResult[0].id);

    expect(results).toHaveLength(2);
    expect(results[0].options).toHaveLength(2);
    expect(results[1].options).toHaveLength(6);
    expect(results[0].options).toEqual(['True', 'False']);
    expect(results[1].options).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('should handle questions with null explanation', async () => {
    // Create course first
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Test course description',
        difficulty_level: 'beginner',
        estimated_duration_hours: 1.5,
        order_index: 1,
      })
      .returning()
      .execute();

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        xp_reward: 10,
        order_index: 1,
      })
      .returning()
      .execute();

    // Create question without explanation
    await db.insert(quizQuestionsTable)
      .values({
        lesson_id: lessonResult[0].id,
        question_text: 'Question without explanation?',
        options: ['Option 1', 'Option 2'],
        correct_answer_index: 0,
        explanation: null,
        order_index: 1,
      })
      .execute();

    const results = await getQuizQuestions(lessonResult[0].id);

    expect(results).toHaveLength(1);
    expect(results[0].explanation).toBeNull();
    expect(results[0].question_text).toEqual('Question without explanation?');
  });

  it('should only return questions for the specified lesson', async () => {
    // Create course first
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Test course description',
        difficulty_level: 'beginner',
        estimated_duration_hours: 1.5,
        order_index: 1,
      })
      .returning()
      .execute();

    // Create two lessons
    const lessonResults = await db.insert(lessonsTable)
      .values([
        {
          course_id: courseResult[0].id,
          title: 'First Lesson',
          content: 'First lesson content',
          xp_reward: 10,
          order_index: 1,
        },
        {
          course_id: courseResult[0].id,
          title: 'Second Lesson',
          content: 'Second lesson content',
          xp_reward: 15,
          order_index: 2,
        },
      ])
      .returning()
      .execute();

    // Create questions for both lessons
    await db.insert(quizQuestionsTable)
      .values([
        {
          lesson_id: lessonResults[0].id,
          question_text: 'Question for lesson 1?',
          options: ['A', 'B'],
          correct_answer_index: 0,
          order_index: 1,
        },
        {
          lesson_id: lessonResults[1].id,
          question_text: 'Question for lesson 2?',
          options: ['X', 'Y'],
          correct_answer_index: 1,
          order_index: 1,
        },
        {
          lesson_id: lessonResults[0].id,
          question_text: 'Another question for lesson 1?',
          options: ['C', 'D'],
          correct_answer_index: 0,
          order_index: 2,
        },
      ])
      .execute();

    // Get questions for first lesson only
    const results = await getQuizQuestions(lessonResults[0].id);

    expect(results).toHaveLength(2);
    expect(results[0].question_text).toEqual('Question for lesson 1?');
    expect(results[1].question_text).toEqual('Another question for lesson 1?');

    // Verify all results belong to the correct lesson
    results.forEach(question => {
      expect(question.lesson_id).toEqual(lessonResults[0].id);
    });
  });
});