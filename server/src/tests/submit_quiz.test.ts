import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, quizQuestionsTable, quizSubmissionsTable } from '../db/schema';
import { type SubmitQuizInput } from '../schema';
import { submitQuiz } from '../handlers/submit_quiz';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashed_password',
  total_xp: 100,
  current_level: 1
};

const testCourse = {
  title: 'Test Course',
  description: 'A test course',
  difficulty_level: 'beginner' as const,
  estimated_duration_hours: 5,
  order_index: 1
};

const testLesson = {
  title: 'Test Lesson',
  content: 'Test lesson content',
  xp_reward: 50,
  order_index: 1
};

const testQuestions = [
  {
    question_text: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correct_answer_index: 1,
    explanation: 'Basic addition',
    order_index: 0
  },
  {
    question_text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correct_answer_index: 2,
    explanation: 'Paris is the capital of France',
    order_index: 1
  }
];

describe('submitQuiz', () => {
  let userId: number;
  let courseId: number;
  let lessonId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    const courseResult = await db.insert(coursesTable)
      .values(testCourse)
      .returning()
      .execute();
    courseId = courseResult[0].id;

    const lessonResult = await db.insert(lessonsTable)
      .values({
        ...testLesson,
        course_id: courseId
      })
      .returning()
      .execute();
    lessonId = lessonResult[0].id;

    // Create quiz questions
    await db.insert(quizQuestionsTable)
      .values(testQuestions.map(q => ({
        ...q,
        lesson_id: lessonId
      })))
      .execute();
  });

  afterEach(resetDB);

  it('should submit quiz with perfect score', async () => {
    const input: SubmitQuizInput = {
      lesson_id: lessonId,
      answers: [1, 2] // Both correct answers
    };

    const result = await submitQuiz(userId, input);

    // Verify submission properties
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.lesson_id).toEqual(lessonId);
    expect(result.answers).toEqual([1, 2]);
    expect(result.score).toEqual(1.0); // 100% score
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(typeof result.score).toBe('number');
  });

  it('should submit quiz with partial score', async () => {
    const input: SubmitQuizInput = {
      lesson_id: lessonId,
      answers: [1, 1] // One correct, one incorrect
    };

    const result = await submitQuiz(userId, input);

    expect(result.score).toEqual(0.5); // 50% score
    expect(result.answers).toEqual([1, 1]);
  });

  it('should submit quiz with zero score', async () => {
    const input: SubmitQuizInput = {
      lesson_id: lessonId,
      answers: [0, 0] // Both incorrect
    };

    const result = await submitQuiz(userId, input);

    expect(result.score).toEqual(0.0); // 0% score
  });

  it('should save submission to database', async () => {
    const input: SubmitQuizInput = {
      lesson_id: lessonId,
      answers: [1, 2]
    };

    const result = await submitQuiz(userId, input);

    // Verify submission is stored in database
    const submissions = await db.select()
      .from(quizSubmissionsTable)
      .where(eq(quizSubmissionsTable.id, result.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].user_id).toEqual(userId);
    expect(submissions[0].lesson_id).toEqual(lessonId);
    expect(submissions[0].answers).toEqual([1, 2]);
    expect(submissions[0].score).toEqual(1.0);
  });

  it('should award XP based on score', async () => {
    const initialXp = testUser.total_xp;
    const input: SubmitQuizInput = {
      lesson_id: lessonId,
      answers: [1, 2] // Perfect score
    };

    await submitQuiz(userId, input);

    // Check user's updated XP
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const expectedXp = initialXp + testLesson.xp_reward; // Full XP for perfect score
    expect(users[0].total_xp).toEqual(expectedXp);
  });

  it('should award partial XP for partial score', async () => {
    const initialXp = testUser.total_xp;
    const input: SubmitQuizInput = {
      lesson_id: lessonId,
      answers: [1, 1] // 50% score
    };

    await submitQuiz(userId, input);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const expectedXp = initialXp + Math.floor(testLesson.xp_reward * 0.5); // 50% of XP
    expect(users[0].total_xp).toEqual(expectedXp);
  });

  it('should not award XP for zero score', async () => {
    const initialXp = testUser.total_xp;
    const input: SubmitQuizInput = {
      lesson_id: lessonId,
      answers: [0, 0] // 0% score
    };

    await submitQuiz(userId, input);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users[0].total_xp).toEqual(initialXp); // No XP awarded
  });

  it('should throw error for non-existent lesson', async () => {
    const input: SubmitQuizInput = {
      lesson_id: 999999,
      answers: [1, 2]
    };

    await expect(submitQuiz(userId, input)).rejects.toThrow(/lesson not found/i);
  });

  it('should throw error for mismatched answer count', async () => {
    const input: SubmitQuizInput = {
      lesson_id: lessonId,
      answers: [1] // Only one answer for two questions
    };

    await expect(submitQuiz(userId, input)).rejects.toThrow(/number of answers must match/i);
  });

  it('should throw error for lesson with no questions', async () => {
    // Create a lesson without questions
    const emptyLessonResult = await db.insert(lessonsTable)
      .values({
        ...testLesson,
        title: 'Empty Lesson',
        course_id: courseId
      })
      .returning()
      .execute();
    
    const emptyLessonId = emptyLessonResult[0].id;

    const input: SubmitQuizInput = {
      lesson_id: emptyLessonId,
      answers: []
    };

    await expect(submitQuiz(userId, input)).rejects.toThrow(/no quiz questions found/i);
  });

  it('should handle questions with different order indexes', async () => {
    // Create a new lesson with questions in different order
    const newLessonResult = await db.insert(lessonsTable)
      .values({
        ...testLesson,
        title: 'Ordered Lesson',
        course_id: courseId
      })
      .returning()
      .execute();
    
    const newLessonId = newLessonResult[0].id;

    // Insert questions with explicit order
    await db.insert(quizQuestionsTable)
      .values([
        {
          lesson_id: newLessonId,
          question_text: 'Second question',
          options: ['A', 'B'],
          correct_answer_index: 0,
          order_index: 1
        },
        {
          lesson_id: newLessonId,
          question_text: 'First question',
          options: ['X', 'Y'],
          correct_answer_index: 1,
          order_index: 0
        }
      ])
      .execute();

    const input: SubmitQuizInput = {
      lesson_id: newLessonId,
      answers: [1, 0] // Answers based on order_index order
    };

    const result = await submitQuiz(userId, input);

    expect(result.score).toEqual(1.0); // Both should be correct based on ordering
  });
});