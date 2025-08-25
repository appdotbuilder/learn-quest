import { db } from '../db';
import { achievementsTable } from '../db/schema';
import { type Achievement } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getAchievements = async (): Promise<Achievement[]> => {
  try {
    // Fetch all active achievements from the database
    const results = await db.select()
      .from(achievementsTable)
      .where(eq(achievementsTable.is_active, true))
      .orderBy(
        asc(achievementsTable.category),
        asc(achievementsTable.created_at)
      )
      .execute();

    // Convert results to match the schema format
    return results.map(achievement => ({
      ...achievement,
      // No numeric conversions needed - all fields are already correct types
    }));
  } catch (error) {
    console.error('Failed to fetch achievements:', error);
    throw error;
  }
};