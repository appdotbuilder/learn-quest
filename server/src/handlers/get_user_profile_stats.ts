import { db } from '../db';
import { 
  usersTable, 
  userAchievementsTable, 
  achievementsTable,
  quizSubmissionsTable,
  userProgressTable,
  coursesTable
} from '../db/schema';
import { type UserProfileStats } from '../schema';
import { eq, sql, and, desc } from 'drizzle-orm';

export async function getUserProfileStats(userId: number): Promise<UserProfileStats> {
  try {
    // 1. Fetch user information
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // 2. Fetch user achievements with achievement details
    const achievementsResult = await db.select()
      .from(userAchievementsTable)
      .innerJoin(achievementsTable, eq(userAchievementsTable.achievement_id, achievementsTable.id))
      .where(eq(userAchievementsTable.user_id, userId))
      .orderBy(desc(userAchievementsTable.earned_at))
      .execute();

    const achievements = achievementsResult.map(result => ({
      id: result.user_achievements.id,
      user_id: result.user_achievements.user_id,
      achievement_id: result.user_achievements.achievement_id,
      earned_at: result.user_achievements.earned_at,
    }));

    // 3. Calculate detailed learning statistics
    
    // Total lessons completed (count distinct lesson_id from user_progress with completed status)
    const lessonsCompletedResult = await db.select({
      count: sql<number>`count(distinct ${userProgressTable.lesson_id})::int`
    })
      .from(userProgressTable)
      .where(
        and(
          eq(userProgressTable.user_id, userId),
          eq(userProgressTable.status, 'completed')
        )
      )
      .execute();

    const totalLessonsCompleted = lessonsCompletedResult[0]?.count || 0;

    // Total quizzes taken and average score
    const quizStatsResult = await db.select({
      count: sql<number>`count(*)::int`,
      avgScore: sql<number>`coalesce(avg(${quizSubmissionsTable.score}), 0)::real`
    })
      .from(quizSubmissionsTable)
      .where(eq(quizSubmissionsTable.user_id, userId))
      .execute();

    const totalQuizzesTaken = quizStatsResult[0]?.count || 0;
    const averageQuizScore = quizStatsResult[0]?.avgScore || 0;

    // Courses completed (count distinct course_id from user_progress with completed status)
    const coursesCompletedResult = await db.select({
      count: sql<number>`count(distinct ${userProgressTable.course_id})::int`
    })
      .from(userProgressTable)
      .where(
        and(
          eq(userProgressTable.user_id, userId),
          eq(userProgressTable.status, 'completed')
        )
      )
      .execute();

    const coursesCompleted = coursesCompletedResult[0]?.count || 0;

    // Current and longest streak calculation
    // For simplicity, we'll calculate based on consecutive days with quiz submissions or progress updates
    const streakResult = await db.execute(sql`
      WITH daily_activity AS (
        SELECT DISTINCT DATE(completed_at) as activity_date
        FROM ${quizSubmissionsTable}
        WHERE ${quizSubmissionsTable.user_id} = ${userId}
        UNION
        SELECT DISTINCT DATE(updated_at) as activity_date
        FROM ${userProgressTable}
        WHERE ${userProgressTable.user_id} = ${userId}
        AND ${userProgressTable.status} = 'completed'
      ),
      streak_groups AS (
        SELECT 
          activity_date,
          ROW_NUMBER() OVER (ORDER BY activity_date) as rn,
          activity_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY activity_date) as streak_group
        FROM daily_activity
        ORDER BY activity_date
      ),
      streaks AS (
        SELECT 
          streak_group,
          COUNT(*) as streak_length,
          MIN(activity_date) as streak_start,
          MAX(activity_date) as streak_end
        FROM streak_groups
        GROUP BY streak_group
      )
      SELECT 
        COALESCE(MAX(streak_length), 0)::int as longest_streak,
        COALESCE(
          (SELECT streak_length::int 
           FROM streaks 
           WHERE streak_end >= CURRENT_DATE - INTERVAL '1 day'
           ORDER BY streak_end DESC 
           LIMIT 1), 
          0
        ) as current_streak
      FROM streaks
    `);

    const streakData = streakResult.rows as Array<{
      current_streak: number;
      longest_streak: number;
    }>;
    const currentStreak = streakData[0]?.current_streak || 0;
    const longestStreak = streakData[0]?.longest_streak || 0;

    // 4. Generate progress history (last 30 days)
    const progressHistoryQueryResult = await db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date as date
      ),
      daily_xp AS (
        SELECT 
          DATE(${userProgressTable.updated_at}) as date,
          COALESCE(SUM(${userProgressTable.xp_earned}), 0)::int as xp_gained
        FROM ${userProgressTable}
        WHERE ${userProgressTable.user_id} = ${userId}
        AND ${userProgressTable.updated_at} >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY DATE(${userProgressTable.updated_at})
      ),
      daily_lessons AS (
        SELECT 
          DATE(${userProgressTable.updated_at}) as date,
          COUNT(DISTINCT ${userProgressTable.lesson_id})::int as lessons_completed
        FROM ${userProgressTable}
        WHERE ${userProgressTable.user_id} = ${userId}
        AND ${userProgressTable.status} = 'completed'
        AND ${userProgressTable.updated_at} >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY DATE(${userProgressTable.updated_at})
      )
      SELECT 
        ds.date,
        COALESCE(dx.xp_gained, 0)::int as xp_gained,
        COALESCE(dl.lessons_completed, 0)::int as lessons_completed
      FROM date_series ds
      LEFT JOIN daily_xp dx ON ds.date = dx.date
      LEFT JOIN daily_lessons dl ON ds.date = dl.date
      ORDER BY ds.date
    `);

    const progressHistoryRows = progressHistoryQueryResult.rows as Array<{
      date: string;
      xp_gained: number;
      lessons_completed: number;
    }>;
    
    const progressHistory = progressHistoryRows.map(row => ({
      date: new Date(row.date),
      xpGained: row.xp_gained,
      lessonsCompleted: row.lessons_completed,
    }));

    // Build the complete profile stats
    const profileStats: UserProfileStats = {
      user: {
        ...user,
        total_xp: user.total_xp,
        current_level: user.current_level,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      achievements,
      statistics: {
        totalLessonsCompleted,
        totalQuizzesTaken,
        averageQuizScore,
        currentStreak,
        longestStreak,
        totalXpEarned: user.total_xp,
        coursesCompleted,
      },
      progressHistory,
    };

    return profileStats;
  } catch (error) {
    console.error('Failed to get user profile stats:', error);
    throw error;
  }
}