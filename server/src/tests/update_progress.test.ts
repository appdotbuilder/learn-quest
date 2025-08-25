import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, userProgressTable, achievementsTable, userAchievementsTable } from '../db/schema';
import { type UpdateProgressInput } from '../schema';
import { updateProgress } from '../handlers/update_progress';
import { eq, and } from 'drizzle-orm';

describe('updateProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let courseId: number;
  let lessonId: number;
  let achievementId: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        total_xp: 0,
        current_level: 1,
      })
      .returning()
      .execute();
    userId = users[0].id;

    // Create test course
    const courses = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        difficulty_level: 'beginner',
        estimated_duration_hours: 5.0,
        is_published: true,
        order_index: 1,
      })
      .returning()
      .execute();
    courseId = courses[0].id;

    // Create test lesson
    const lessons = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        content: 'Lesson content',
        xp_reward: 50,
        order_index: 1,
        is_published: true,
      })
      .returning()
      .execute();
    lessonId = lessons[0].id;

    // Create test achievement
    const achievements = await db.insert(achievementsTable)
      .values({
        name: 'First Lesson',
        description: 'Complete your first lesson',
        badge_icon: 'star',
        badge_color: 'gold',
        xp_reward: 25,
        unlock_criteria: '1_lesson',
        category: 'milestone',
        is_active: true,
      })
      .returning()
      .execute();
    achievementId = achievements[0].id;
  });

  describe('course progress', () => {
    it('should create new course progress record', async () => {
      const input: UpdateProgressInput = {
        course_id: courseId,
        status: 'in_progress',
        completion_percentage: 25,
        xp_earned: 0,
      };

      const result = await updateProgress(userId, input);

      expect(result.user_id).toEqual(userId);
      expect(result.course_id).toEqual(courseId);
      expect(result.lesson_id).toBeNull();
      expect(result.status).toEqual('in_progress');
      expect(result.completion_percentage).toEqual(25);
      expect(result.xp_earned).toEqual(0);
      expect(result.started_at).toBeInstanceOf(Date);
      expect(result.completed_at).toBeNull();
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update existing course progress record', async () => {
      // Create initial progress
      await db.insert(userProgressTable)
        .values({
          user_id: userId,
          course_id: courseId,
          lesson_id: null,
          status: 'in_progress',
          completion_percentage: 25.0,
          xp_earned: 0,
          started_at: new Date(),
        })
        .execute();

      const input: UpdateProgressInput = {
        course_id: courseId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 100,
      };

      const result = await updateProgress(userId, input);

      expect(result.status).toEqual('completed');
      expect(result.completion_percentage).toEqual(100);
      expect(result.xp_earned).toEqual(100);
      expect(result.completed_at).toBeInstanceOf(Date);
    });

    it('should award XP to user when completing course', async () => {
      const input: UpdateProgressInput = {
        course_id: courseId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 200,
      };

      await updateProgress(userId, input);

      // Check that user's XP was updated
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(users[0].total_xp).toEqual(200);
      expect(users[0].current_level).toEqual(3); // 200 XP = level 3
    });
  });

  describe('lesson progress', () => {
    it('should create new lesson progress record', async () => {
      const input: UpdateProgressInput = {
        course_id: courseId,
        lesson_id: lessonId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 50,
      };

      const result = await updateProgress(userId, input);

      expect(result.user_id).toEqual(userId);
      expect(result.course_id).toEqual(courseId);
      expect(result.lesson_id).toEqual(lessonId);
      expect(result.status).toEqual('completed');
      expect(result.completion_percentage).toEqual(100);
      expect(result.xp_earned).toEqual(50);
      expect(result.started_at).toBeInstanceOf(Date);
      expect(result.completed_at).toBeInstanceOf(Date);
    });

    it('should update existing lesson progress record', async () => {
      // Create initial progress
      await db.insert(userProgressTable)
        .values({
          user_id: userId,
          course_id: courseId,
          lesson_id: lessonId,
          status: 'in_progress',
          completion_percentage: 50.0,
          xp_earned: 0,
          started_at: new Date(),
        })
        .execute();

      const input: UpdateProgressInput = {
        course_id: courseId,
        lesson_id: lessonId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 50,
      };

      const result = await updateProgress(userId, input);

      expect(result.status).toEqual('completed');
      expect(result.completion_percentage).toEqual(100);
      expect(result.xp_earned).toEqual(50);
      expect(result.completed_at).toBeInstanceOf(Date);
    });

    it('should not award XP twice for same completion', async () => {
      // First completion
      const input: UpdateProgressInput = {
        course_id: courseId,
        lesson_id: lessonId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 50,
      };

      await updateProgress(userId, input);

      // Second update (already completed)
      await updateProgress(userId, input);

      // Check that user only got XP once
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(users[0].total_xp).toEqual(75); // Lesson XP (50) + Achievement XP (25) - awarded only once
    });
  });

  describe('validation', () => {
    it('should throw error if user does not exist', async () => {
      const input: UpdateProgressInput = {
        course_id: courseId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 50,
      };

      await expect(updateProgress(999999, input)).rejects.toThrow(/user not found/i);
    });

    it('should throw error if course does not exist', async () => {
      const input: UpdateProgressInput = {
        course_id: 999999,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 50,
      };

      await expect(updateProgress(userId, input)).rejects.toThrow(/course not found/i);
    });

    it('should throw error if lesson does not exist', async () => {
      const input: UpdateProgressInput = {
        course_id: courseId,
        lesson_id: 999999,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 50,
      };

      await expect(updateProgress(userId, input)).rejects.toThrow(/lesson not found/i);
    });

    it('should throw error if lesson does not belong to course', async () => {
      // Create another course
      const otherCourses = await db.insert(coursesTable)
        .values({
          title: 'Other Course',
          description: 'Another course',
          difficulty_level: 'intermediate',
          estimated_duration_hours: 3.0,
          is_published: true,
          order_index: 2,
        })
        .returning()
        .execute();

      const input: UpdateProgressInput = {
        course_id: otherCourses[0].id,
        lesson_id: lessonId, // Belongs to first course
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 50,
      };

      await expect(updateProgress(userId, input)).rejects.toThrow(/does not belong to the specified course/i);
    });
  });

  describe('achievements', () => {
    it('should check and award achievements on completion', async () => {
      const input: UpdateProgressInput = {
        course_id: courseId,
        lesson_id: lessonId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 50,
      };

      await updateProgress(userId, input);

      // Check if achievement was awarded
      const userAchievements = await db.select()
        .from(userAchievementsTable)
        .where(eq(userAchievementsTable.user_id, userId))
        .execute();

      expect(userAchievements.length).toBeGreaterThan(0);
      
      // Check that achievement XP was also awarded
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      // Should have lesson XP (50) + achievement XP (25)
      expect(users[0].total_xp).toEqual(75);
    });

    it('should not award same achievement twice', async () => {
      // Manually award achievement first
      await db.insert(userAchievementsTable)
        .values({
          user_id: userId,
          achievement_id: achievementId,
          earned_at: new Date(),
        })
        .execute();

      const input: UpdateProgressInput = {
        course_id: courseId,
        lesson_id: lessonId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 50,
      };

      await updateProgress(userId, input);

      // Check that we still only have one achievement
      const userAchievements = await db.select()
        .from(userAchievementsTable)
        .where(eq(userAchievementsTable.user_id, userId))
        .execute();

      expect(userAchievements).toHaveLength(1);
    });
  });

  describe('timestamp handling', () => {
    it('should set started_at when moving from not_started', async () => {
      const input: UpdateProgressInput = {
        course_id: courseId,
        status: 'in_progress',
        completion_percentage: 25,
      };

      const result = await updateProgress(userId, input);

      expect(result.started_at).toBeInstanceOf(Date);
      expect(result.completed_at).toBeNull();
    });

    it('should preserve started_at when updating existing progress', async () => {
      const initialStartTime = new Date('2023-01-01T00:00:00Z');
      
      // Create initial progress with specific start time
      await db.insert(userProgressTable)
        .values({
          user_id: userId,
          course_id: courseId,
          lesson_id: null,
          status: 'in_progress',
          completion_percentage: 25.0,
          xp_earned: 0,
          started_at: initialStartTime,
        })
        .execute();

      const input: UpdateProgressInput = {
        course_id: courseId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: 100,
      };

      const result = await updateProgress(userId, input);

      expect(result.started_at).toEqual(initialStartTime);
      expect(result.completed_at).toBeInstanceOf(Date);
    });
  });

  describe('numeric conversion', () => {
    it('should properly handle completion_percentage as number', async () => {
      const input: UpdateProgressInput = {
        course_id: courseId,
        status: 'in_progress',
        completion_percentage: 75.5,
      };

      const result = await updateProgress(userId, input);

      expect(typeof result.completion_percentage).toBe('number');
      expect(result.completion_percentage).toEqual(75.5);

      // Verify in database
      const dbRecord = await db.select()
        .from(userProgressTable)
        .where(eq(userProgressTable.id, result.id))
        .execute();

      expect(parseFloat(dbRecord[0].completion_percentage.toString())).toEqual(75.5);
    });
  });
});