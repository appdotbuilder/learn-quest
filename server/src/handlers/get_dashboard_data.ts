import { db } from '../db';
import { 
  usersTable, 
  userAchievementsTable, 
  achievementsTable,
  coursesTable,
  userProgressTable,
  lessonsTable
} from '../db/schema';
import { type DashboardData } from '../schema';
import { eq, desc, and, sql, SQL } from 'drizzle-orm';

export async function getDashboardData(userId: number): Promise<DashboardData> {
  try {
    // 1. Fetch user profile information
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userResults.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    const user = userResults[0];

    // 2. Get recent achievements (last 5 earned) with achievement details
    const recentAchievementsResults = await db.select({
      id: userAchievementsTable.id,
      user_id: userAchievementsTable.user_id,
      achievement_id: userAchievementsTable.achievement_id,
      earned_at: userAchievementsTable.earned_at,
    })
      .from(userAchievementsTable)
      .innerJoin(achievementsTable, eq(userAchievementsTable.achievement_id, achievementsTable.id))
      .where(eq(userAchievementsTable.user_id, userId))
      .orderBy(desc(userAchievementsTable.earned_at))
      .limit(5)
      .execute();

    // 3. Calculate overall progress statistics
    const courseStatsResults = await db.select({
      totalCourses: sql<number>`count(*)`.as('total_courses'),
      completedCourses: sql<number>`count(*) filter (where ${userProgressTable.status} = 'completed')`.as('completed_courses'),
      inProgressCourses: sql<number>`count(*) filter (where ${userProgressTable.status} = 'in_progress')`.as('in_progress_courses'),
    })
      .from(coursesTable)
      .leftJoin(userProgressTable, and(
        eq(userProgressTable.course_id, coursesTable.id),
        eq(userProgressTable.user_id, userId)
      ))
      .where(eq(coursesTable.is_published, true))
      .execute();

    const courseStats = courseStatsResults[0] || {
      totalCourses: 0,
      completedCourses: 0,
      inProgressCourses: 0
    };

    // 4. Find recommended next lessons based on progress
    // Get lessons from courses where user has progress but hasn't completed all lessons
    const conditions: SQL<unknown>[] = [
      eq(lessonsTable.is_published, true),
      eq(coursesTable.is_published, true)
    ];

    // Include lessons from courses that are either:
    // 1. Not started (userProgressTable.status is null)
    // 2. In progress (userProgressTable.status = 'in_progress')
    conditions.push(
      sql`(${userProgressTable.status} IS NULL OR ${userProgressTable.status} = 'in_progress' OR ${userProgressTable.status} = 'not_started')`
    );

    const recommendedLessons = await db.select({
      id: lessonsTable.id,
      course_id: lessonsTable.course_id,
      title: lessonsTable.title,
      content: lessonsTable.content,
      code_template: lessonsTable.code_template,
      programming_language: lessonsTable.programming_language,
      xp_reward: lessonsTable.xp_reward,
      order_index: lessonsTable.order_index,
      is_published: lessonsTable.is_published,
      created_at: lessonsTable.created_at,
      updated_at: lessonsTable.updated_at,
    })
      .from(lessonsTable)
      .innerJoin(coursesTable, eq(lessonsTable.course_id, coursesTable.id))
      .leftJoin(userProgressTable, and(
        eq(userProgressTable.course_id, coursesTable.id),
        eq(userProgressTable.user_id, userId)
      ))
      .where(and(...conditions))
      .orderBy(coursesTable.order_index, lessonsTable.order_index)
      .limit(3)
      .execute();

    // 5. Compile comprehensive dashboard data
    return {
      user: user,
      recentAchievements: recentAchievementsResults,
      overallProgress: {
        totalCourses: Number(courseStats.totalCourses),
        completedCourses: Number(courseStats.completedCourses),
        inProgressCourses: Number(courseStats.inProgressCourses),
        totalXp: user.total_xp,
        currentLevel: user.current_level,
      },
      recommendedLessons: recommendedLessons,
    };
  } catch (error) {
    console.error('Dashboard data fetch failed:', error);
    throw error;
  }
}