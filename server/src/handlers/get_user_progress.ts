import { db } from '../db';
import { userProgressTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UserProgress } from '../schema';

export const getUserProgress = async (userId: number): Promise<UserProgress[]> => {
  try {
    // Fetch all progress records for the specific user
    const results = await db.select()
      .from(userProgressTable)
      .where(eq(userProgressTable.user_id, userId))
      .execute();

    // Return results directly - real fields already return as numbers
    return results;
  } catch (error) {
    console.error('Get user progress failed:', error);
    throw error;
  }
};