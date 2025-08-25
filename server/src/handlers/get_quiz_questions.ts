import { db } from '../db';
import { quizQuestionsTable } from '../db/schema';
import { type QuizQuestion } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getQuizQuestions = async (lessonId: number): Promise<QuizQuestion[]> => {
  try {
    const results = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.lesson_id, lessonId))
      .orderBy(asc(quizQuestionsTable.order_index))
      .execute();

    return results.map(question => ({
      ...question,
      options: question.options as string[], // Type assertion for JSON field
    }));
  } catch (error) {
    console.error('Get quiz questions failed:', error);
    throw error;
  }
};