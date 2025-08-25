import { db } from '../db';
import { userAchievementsTable, achievementsTable } from '../db/schema';
import { type UserAchievement } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserAchievements(userId: number): Promise<UserAchievement[]> {
  try {
    // Query user achievements with achievement details, ordered by most recently earned first
    const results = await db.select()
      .from(userAchievementsTable)
      .innerJoin(achievementsTable, eq(userAchievementsTable.achievement_id, achievementsTable.id))
      .where(eq(userAchievementsTable.user_id, userId))
      .orderBy(desc(userAchievementsTable.earned_at))
      .execute();

    // Map the joined results back to UserAchievement format
    return results.map(result => ({
      id: result.user_achievements.id,
      user_id: result.user_achievements.user_id,
      achievement_id: result.user_achievements.achievement_id,
      earned_at: result.user_achievements.earned_at,
    }));
  } catch (error) {
    console.error('Failed to fetch user achievements:', error);
    throw error;
  }
}