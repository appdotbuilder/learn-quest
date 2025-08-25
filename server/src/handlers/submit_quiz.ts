import { db } from '../db';
import { quizQuestionsTable, quizSubmissionsTable, lessonsTable, usersTable } from '../db/schema';
import { type SubmitQuizInput, type QuizSubmission } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function submitQuiz(userId: number, input: SubmitQuizInput): Promise<QuizSubmission> {
  try {
    // 1. First check if lesson exists
    const lessonResults = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, input.lesson_id))
      .execute();

    if (lessonResults.length === 0) {
      throw new Error('Lesson not found');
    }

    const lesson = lessonResults[0];

    // 2. Fetch quiz questions for the lesson
    const questions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.lesson_id, input.lesson_id))
      .orderBy(quizQuestionsTable.order_index)
      .execute();

    if (questions.length === 0) {
      throw new Error('No quiz questions found for this lesson');
    }

    if (input.answers.length !== questions.length) {
      throw new Error('Number of answers must match number of questions');
    }

    // 3. Calculate score based on correct answers
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (input.answers[index] === question.correct_answer_index) {
        correctAnswers++;
      }
    });

    const score = questions.length > 0 ? correctAnswers / questions.length : 0;

    // 4. Award XP based on quiz performance (proportional to score)
    const xpAwarded = Math.floor(lesson.xp_reward * score);

    // 5. Update user's total XP
    if (xpAwarded > 0) {
      await db.update(usersTable)
        .set({ 
          total_xp: sql`${usersTable.total_xp} + ${xpAwarded}`,
          updated_at: new Date()
        })
        .where(eq(usersTable.id, userId))
        .execute();
    }

    // 6. Store quiz submission record
    const submissionResult = await db.insert(quizSubmissionsTable)
      .values({
        user_id: userId,
        lesson_id: input.lesson_id,
        answers: input.answers,
        score: score // real column accepts number directly
      })
      .returning()
      .execute();

    const submission = submissionResult[0];

    // 7. Return submission (score is already a number for real columns)
    return submission;
  } catch (error) {
    console.error('Quiz submission failed:', error);
    throw error;
  }
}