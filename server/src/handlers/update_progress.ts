import { db } from '../db';
import { userProgressTable, usersTable, lessonsTable, coursesTable, achievementsTable, userAchievementsTable } from '../db/schema';
import { type UpdateProgressInput, type UserProgress } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export async function updateProgress(userId: number, input: UpdateProgressInput): Promise<UserProgress> {
  try {
    // First, verify that the user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Verify that the course exists
    const courseExists = await db.select({ id: coursesTable.id })
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (courseExists.length === 0) {
      throw new Error('Course not found');
    }

    // If lesson_id is provided, verify it exists and belongs to the course
    if (input.lesson_id) {
      const lessonExists = await db.select({ id: lessonsTable.id, xp_reward: lessonsTable.xp_reward })
        .from(lessonsTable)
        .where(and(
          eq(lessonsTable.id, input.lesson_id),
          eq(lessonsTable.course_id, input.course_id)
        ))
        .execute();

      if (lessonExists.length === 0) {
        throw new Error('Lesson not found or does not belong to the specified course');
      }
    }

    // Check if progress record already exists
    const existingProgress = await db.select()
      .from(userProgressTable)
      .where(and(
        eq(userProgressTable.user_id, userId),
        eq(userProgressTable.course_id, input.course_id),
        input.lesson_id ? eq(userProgressTable.lesson_id, input.lesson_id) : sql`lesson_id IS NULL`
      ))
      .execute();

    let progressRecord: UserProgress;
    const now = new Date();

    if (existingProgress.length > 0) {
      // Update existing progress record
      const existing = existingProgress[0];
      const isNewCompletion = existing.status !== 'completed' && input.status === 'completed';
      const xpToAward = isNewCompletion ? (input.xp_earned || 0) : 0;

      const updateData: any = {
        status: input.status,
        completion_percentage: parseFloat(input.completion_percentage.toString()),
        updated_at: now,
      };

      // Set started_at if moving from not_started to in_progress or completed
      if (existing.status === 'not_started' && input.status !== 'not_started') {
        updateData.started_at = existing.started_at || now;
      }

      // Set completed_at if completing for the first time
      if (isNewCompletion) {
        updateData.completed_at = now;
        updateData.xp_earned = existing.xp_earned + xpToAward;
      }

      const updated = await db.update(userProgressTable)
        .set(updateData)
        .where(eq(userProgressTable.id, existing.id))
        .returning()
        .execute();

      const updatedRecord = updated[0];
      progressRecord = {
        ...updatedRecord,
        completion_percentage: parseFloat(updatedRecord.completion_percentage.toString())
      };

      // Award XP to user if this is a new completion
      if (xpToAward > 0) {
        await awardXpToUser(userId, xpToAward);
      }
    } else {
      // Create new progress record
      const xpToAward = input.status === 'completed' ? (input.xp_earned || 0) : 0;

      const insertData: any = {
        user_id: userId,
        course_id: input.course_id,
        lesson_id: input.lesson_id || null,
        status: input.status,
        completion_percentage: parseFloat(input.completion_percentage.toString()),
        xp_earned: xpToAward,
        updated_at: now,
      };

      // Set timestamps based on status
      if (input.status !== 'not_started') {
        insertData.started_at = now;
      }
      if (input.status === 'completed') {
        insertData.completed_at = now;
      }

      const created = await db.insert(userProgressTable)
        .values(insertData)
        .returning()
        .execute();

      const createdRecord = created[0];
      progressRecord = {
        ...createdRecord,
        completion_percentage: parseFloat(createdRecord.completion_percentage.toString())
      };

      // Award XP to user if completing
      if (xpToAward > 0) {
        await awardXpToUser(userId, xpToAward);
      }
    }

    // Check for achievements only if this is a new completion
    if (input.status === 'completed' && (existingProgress.length === 0 || existingProgress[0].status !== 'completed')) {
      await checkAndAwardAchievements(userId);
    }

    return progressRecord;
  } catch (error) {
    console.error('Progress update failed:', error);
    throw error;
  }
}

async function awardXpToUser(userId: number, xpAmount: number): Promise<void> {
  // Get current user data
  const users = await db.select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .execute();

  if (users.length === 0) {
    return;
  }

  const user = users[0];
  const newTotalXp = user.total_xp + xpAmount;
  
  // Simple level calculation: every 100 XP is a new level
  const newLevel = Math.floor(newTotalXp / 100) + 1;

  await db.update(usersTable)
    .set({
      total_xp: newTotalXp,
      current_level: newLevel,
      updated_at: new Date()
    })
    .where(eq(usersTable.id, userId))
    .execute();
}

async function checkAndAwardAchievements(userId: number): Promise<void> {
  // Get user's current progress
  const userProgress = await db.select()
    .from(userProgressTable)
    .where(and(
      eq(userProgressTable.user_id, userId),
      eq(userProgressTable.status, 'completed')
    ))
    .execute();

  const completedLessons = userProgress.filter(p => p.lesson_id !== null).length;
  const completedCourses = userProgress.filter(p => p.lesson_id === null).length;

  // Get available achievements
  const availableAchievements = await db.select()
    .from(achievementsTable)
    .where(eq(achievementsTable.is_active, true))
    .execute();

  // Get already earned achievements
  const earnedAchievements = await db.select({ achievement_id: userAchievementsTable.achievement_id })
    .from(userAchievementsTable)
    .where(eq(userAchievementsTable.user_id, userId))
    .execute();

  const earnedIds = new Set(earnedAchievements.map(a => a.achievement_id));

  // Check each achievement
  for (const achievement of availableAchievements) {
    if (earnedIds.has(achievement.id)) {
      continue; // Already earned
    }

    let shouldAward = false;

    // Simple achievement logic based on category
    switch (achievement.category) {
      case 'milestone':
        // Award milestone achievements based on lesson completion count
        if (achievement.unlock_criteria.includes('1_lesson') && completedLessons >= 1) {
          shouldAward = true;
        } else if (achievement.unlock_criteria.includes('5_lessons') && completedLessons >= 5) {
          shouldAward = true;
        } else if (achievement.unlock_criteria.includes('10_lessons') && completedLessons >= 10) {
          shouldAward = true;
        }
        break;
      case 'course_completion':
        // Award for completing courses
        if (achievement.unlock_criteria.includes('1_course') && completedCourses >= 1) {
          shouldAward = true;
        } else if (achievement.unlock_criteria.includes('3_courses') && completedCourses >= 3) {
          shouldAward = true;
        }
        break;
      // Add more achievement logic as needed
    }

    if (shouldAward) {
      await db.insert(userAchievementsTable)
        .values({
          user_id: userId,
          achievement_id: achievement.id,
          earned_at: new Date()
        })
        .execute();

      // Award achievement XP
      if (achievement.xp_reward > 0) {
        await awardXpToUser(userId, achievement.xp_reward);
      }
    }
  }
}