import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable,
  lessonsTable,
  achievementsTable,
  userAchievementsTable,
  quizSubmissionsTable,
  userProgressTable
} from '../db/schema';
import { getUserProfileStats } from '../handlers/get_user_profile_stats';

describe('getUserProfileStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get basic user profile stats', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        username: 'testuser',
        password_hash: 'hashed',
        total_xp: 250,
        current_level: 3,
        avatar_url: 'https://example.com/avatar.jpg',
      })
      .returning()
      .execute();

    const userId = users[0].id;

    const result = await getUserProfileStats(userId);

    // Verify user data
    expect(result.user.id).toEqual(userId);
    expect(result.user.email).toEqual('testuser@example.com');
    expect(result.user.username).toEqual('testuser');
    expect(result.user.total_xp).toEqual(250);
    expect(result.user.current_level).toEqual(3);
    expect(result.user.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify empty stats for new user
    expect(result.achievements).toHaveLength(0);
    expect(result.statistics.totalLessonsCompleted).toEqual(0);
    expect(result.statistics.totalQuizzesTaken).toEqual(0);
    expect(result.statistics.averageQuizScore).toEqual(0);
    expect(result.statistics.currentStreak).toEqual(0);
    expect(result.statistics.longestStreak).toEqual(0);
    expect(result.statistics.totalXpEarned).toEqual(250);
    expect(result.statistics.coursesCompleted).toEqual(0);

    // Progress history should have 30 days of data
    expect(result.progressHistory).toHaveLength(30);
    expect(result.progressHistory[0].date).toBeInstanceOf(Date);
    expect(result.progressHistory[0].xpGained).toEqual(0);
    expect(result.progressHistory[0].lessonsCompleted).toEqual(0);
  });

  it('should calculate statistics with achievements and progress', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'activeuser@example.com',
        username: 'activeuser',
        password_hash: 'hashed',
        total_xp: 500,
        current_level: 5,
        avatar_url: null,
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create test course
    const courses = await db.insert(coursesTable)
      .values({
        title: 'JavaScript Basics',
        description: 'Learn JavaScript fundamentals',
        difficulty_level: 'beginner',
        estimated_duration_hours: 10.5,
        is_published: true,
        order_index: 1,
      })
      .returning()
      .execute();

    const courseId = courses[0].id;

    // Create test lessons
    const lessons = await db.insert(lessonsTable)
      .values([
        {
          course_id: courseId,
          title: 'Variables and Types',
          content: 'Learn about variables',
          xp_reward: 20,
          order_index: 1,
          is_published: true,
        },
        {
          course_id: courseId,
          title: 'Functions',
          content: 'Learn about functions',
          xp_reward: 25,
          order_index: 2,
          is_published: true,
        }
      ])
      .returning()
      .execute();

    const [lesson1, lesson2] = lessons;

    // Create test achievements
    const achievements = await db.insert(achievementsTable)
      .values([
        {
          name: 'First Steps',
          description: 'Complete your first lesson',
          badge_icon: 'star',
          badge_color: 'gold',
          xp_reward: 50,
          unlock_criteria: 'Complete 1 lesson',
          category: 'milestone',
        },
        {
          name: 'Quiz Master',
          description: 'Perfect score on quiz',
          badge_icon: 'trophy',
          badge_color: 'blue',
          xp_reward: 30,
          unlock_criteria: 'Score 100% on quiz',
          category: 'quiz_master',
        }
      ])
      .returning()
      .execute();

    const [achievement1, achievement2] = achievements;

    // Create user achievements
    await db.insert(userAchievementsTable)
      .values([
        {
          user_id: userId,
          achievement_id: achievement1.id,
          earned_at: new Date(Date.now() - 86400000), // 1 day ago
        },
        {
          user_id: userId,
          achievement_id: achievement2.id,
          earned_at: new Date(Date.now() - 43200000), // 12 hours ago
        }
      ])
      .execute();

    // Create user progress (completed lessons)
    await db.insert(userProgressTable)
      .values([
        {
          user_id: userId,
          course_id: courseId,
          lesson_id: lesson1.id,
          status: 'completed',
          completion_percentage: 100,
          xp_earned: 20,
          started_at: new Date(Date.now() - 86400000),
          completed_at: new Date(Date.now() - 86400000),
          updated_at: new Date(Date.now() - 86400000),
        },
        {
          user_id: userId,
          course_id: courseId,
          lesson_id: lesson2.id,
          status: 'completed',
          completion_percentage: 100,
          xp_earned: 25,
          started_at: new Date(Date.now() - 43200000),
          completed_at: new Date(Date.now() - 43200000),
          updated_at: new Date(Date.now() - 43200000),
        },
        {
          user_id: userId,
          course_id: courseId,
          lesson_id: null,
          status: 'completed',
          completion_percentage: 100,
          xp_earned: 45,
          completed_at: new Date(),
          updated_at: new Date(),
        }
      ])
      .execute();

    // Create quiz submissions
    await db.insert(quizSubmissionsTable)
      .values([
        {
          user_id: userId,
          lesson_id: lesson1.id,
          answers: [0, 1, 2],
          score: 1.0,
          completed_at: new Date(Date.now() - 86400000),
        },
        {
          user_id: userId,
          lesson_id: lesson2.id,
          answers: [1, 0, 2],
          score: 0.75,
          completed_at: new Date(Date.now() - 43200000),
        }
      ])
      .execute();

    const result = await getUserProfileStats(userId);

    // Verify user data
    expect(result.user.id).toEqual(userId);
    expect(result.user.email).toEqual('activeuser@example.com');
    expect(result.user.total_xp).toEqual(500);
    expect(result.user.current_level).toEqual(5);

    // Verify achievements
    expect(result.achievements).toHaveLength(2);
    expect(result.achievements[0].user_id).toEqual(userId);
    expect(result.achievements[0].achievement_id).toEqual(achievement2.id); // Most recent first
    expect(result.achievements[0].earned_at).toBeInstanceOf(Date);
    expect(result.achievements[1].achievement_id).toEqual(achievement1.id);

    // Verify statistics
    expect(result.statistics.totalLessonsCompleted).toEqual(2);
    expect(result.statistics.totalQuizzesTaken).toEqual(2);
    expect(result.statistics.averageQuizScore).toBeCloseTo(0.875, 2); // (1.0 + 0.75) / 2
    expect(result.statistics.totalXpEarned).toEqual(500);
    expect(result.statistics.coursesCompleted).toEqual(1);

    // Verify progress history has data for recent days
    expect(result.progressHistory).toHaveLength(30);
    const today = result.progressHistory[29]; // Last item is today
    const yesterday = result.progressHistory[28]; // Second to last is yesterday

    expect(today.date).toBeInstanceOf(Date);
    expect(today.xpGained).toBeGreaterThanOrEqual(0);
    expect(yesterday.xpGained).toBeGreaterThanOrEqual(0);
  });

  it('should handle user not found', async () => {
    await expect(getUserProfileStats(999999))
      .rejects
      .toThrow(/user not found/i);
  });

  it('should handle user with no activity', async () => {
    // Create user with minimal data
    const users = await db.insert(usersTable)
      .values({
        email: 'minimal@example.com',
        username: 'minimal',
        password_hash: 'hashed',
        total_xp: 0,
        current_level: 1,
        avatar_url: null,
      })
      .returning()
      .execute();

    const userId = users[0].id;

    const result = await getUserProfileStats(userId);

    // All statistics should be zero or empty
    expect(result.achievements).toHaveLength(0);
    expect(result.statistics.totalLessonsCompleted).toEqual(0);
    expect(result.statistics.totalQuizzesTaken).toEqual(0);
    expect(result.statistics.averageQuizScore).toEqual(0);
    expect(result.statistics.currentStreak).toEqual(0);
    expect(result.statistics.longestStreak).toEqual(0);
    expect(result.statistics.totalXpEarned).toEqual(0);
    expect(result.statistics.coursesCompleted).toEqual(0);

    // Progress history should still have 30 days of zeros
    expect(result.progressHistory).toHaveLength(30);
    result.progressHistory.forEach(day => {
      expect(day.xpGained).toEqual(0);
      expect(day.lessonsCompleted).toEqual(0);
      expect(day.date).toBeInstanceOf(Date);
    });
  });

  it('should calculate progress history correctly', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'progress@example.com',
        username: 'progress',
        password_hash: 'hashed',
        total_xp: 100,
        current_level: 2,
        avatar_url: null,
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create test course and lesson
    const courses = await db.insert(coursesTable)
      .values({
        title: 'Progress Course',
        description: 'Test course for progress',
        difficulty_level: 'beginner',
        estimated_duration_hours: 5.0,
        is_published: true,
        order_index: 1,
      })
      .returning()
      .execute();

    const courseId = courses[0].id;

    const lessons = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Progress Lesson',
        content: 'Test lesson',
        xp_reward: 30,
        order_index: 1,
        is_published: true,
      })
      .returning()
      .execute();

    const lessonId = lessons[0].id;

    // Create progress entries for specific dates
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    const oneDayAgo = new Date(Date.now() - 86400000);

    await db.insert(userProgressTable)
      .values([
        {
          user_id: userId,
          course_id: courseId,
          lesson_id: lessonId,
          status: 'completed',
          completion_percentage: 100,
          xp_earned: 30,
          completed_at: twoDaysAgo,
          updated_at: twoDaysAgo,
        },
        {
          user_id: userId,
          course_id: courseId,
          lesson_id: null,
          status: 'completed',
          completion_percentage: 100,
          xp_earned: 70,
          completed_at: oneDayAgo,
          updated_at: oneDayAgo,
        }
      ])
      .execute();

    const result = await getUserProfileStats(userId);

    expect(result.progressHistory).toHaveLength(30);

    // Find the days with XP gained
    const historyWithXp = result.progressHistory.filter(day => day.xpGained > 0);
    expect(historyWithXp.length).toBeGreaterThanOrEqual(1);

    // Verify dates are properly formatted
    result.progressHistory.forEach(day => {
      expect(day.date).toBeInstanceOf(Date);
      expect(typeof day.xpGained).toBe('number');
      expect(typeof day.lessonsCompleted).toBe('number');
      expect(day.xpGained).toBeGreaterThanOrEqual(0);
      expect(day.lessonsCompleted).toBeGreaterThanOrEqual(0);
    });

    // Verify chronological order (earliest to latest)
    for (let i = 1; i < result.progressHistory.length; i++) {
      expect(result.progressHistory[i].date >= result.progressHistory[i - 1].date).toBe(true);
    }
  });
});