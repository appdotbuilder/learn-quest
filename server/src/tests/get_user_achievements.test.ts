import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, achievementsTable, userAchievementsTable } from '../db/schema';
import { getUserAchievements } from '../handlers/get_user_achievements';
import { eq } from 'drizzle-orm';

describe('getUserAchievements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no achievements', async () => {
    // Create a user with no achievements
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpass',
      })
      .returning()
      .execute();

    const result = await getUserAchievements(user.id);

    expect(result).toEqual([]);
  });

  it('should return user achievements ordered by most recent first', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpass',
      })
      .returning()
      .execute();

    // Create test achievements
    const [achievement1] = await db.insert(achievementsTable)
      .values({
        name: 'First Steps',
        description: 'Complete your first lesson',
        badge_icon: 'star',
        badge_color: '#FFD700',
        xp_reward: 50,
        unlock_criteria: 'lesson_completed:1',
        category: 'milestone',
      })
      .returning()
      .execute();

    const [achievement2] = await db.insert(achievementsTable)
      .values({
        name: 'Quiz Master',
        description: 'Score 100% on 5 quizzes',
        badge_icon: 'trophy',
        badge_color: '#FF6B35',
        xp_reward: 100,
        unlock_criteria: 'perfect_quiz_score:5',
        category: 'quiz_master',
      })
      .returning()
      .execute();

    // Create user achievements with different earned dates
    const olderDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const newerDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

    const [userAchievement1] = await db.insert(userAchievementsTable)
      .values({
        user_id: user.id,
        achievement_id: achievement1.id,
        earned_at: olderDate,
      })
      .returning()
      .execute();

    const [userAchievement2] = await db.insert(userAchievementsTable)
      .values({
        user_id: user.id,
        achievement_id: achievement2.id,
        earned_at: newerDate,
      })
      .returning()
      .execute();

    const result = await getUserAchievements(user.id);

    // Should return achievements ordered by most recent first
    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(userAchievement2.id);
    expect(result[0].achievement_id).toEqual(achievement2.id);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].earned_at).toEqual(newerDate);
    
    expect(result[1].id).toEqual(userAchievement1.id);
    expect(result[1].achievement_id).toEqual(achievement1.id);
    expect(result[1].user_id).toEqual(user.id);
    expect(result[1].earned_at).toEqual(olderDate);
  });

  it('should only return achievements for the specified user', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        password_hash: 'hashedpass1',
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpass2',
      })
      .returning()
      .execute();

    // Create test achievement
    const [achievement] = await db.insert(achievementsTable)
      .values({
        name: 'Test Achievement',
        description: 'A test achievement',
        badge_icon: 'star',
        badge_color: '#FFD700',
        xp_reward: 50,
        unlock_criteria: 'test',
        category: 'milestone',
      })
      .returning()
      .execute();

    // Give achievement to both users
    await db.insert(userAchievementsTable)
      .values([
        {
          user_id: user1.id,
          achievement_id: achievement.id,
        },
        {
          user_id: user2.id,
          achievement_id: achievement.id,
        },
      ])
      .execute();

    // Should only return achievements for user1
    const result = await getUserAchievements(user1.id);
    
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].achievement_id).toEqual(achievement.id);
  });

  it('should return correct data structure for UserAchievement', async () => {
    // Create test user and achievement
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpass',
      })
      .returning()
      .execute();

    const [achievement] = await db.insert(achievementsTable)
      .values({
        name: 'Test Achievement',
        description: 'A test achievement',
        badge_icon: 'star',
        badge_color: '#FFD700',
        xp_reward: 50,
        unlock_criteria: 'test',
        category: 'milestone',
      })
      .returning()
      .execute();

    const earnedDate = new Date();
    const [userAchievement] = await db.insert(userAchievementsTable)
      .values({
        user_id: user.id,
        achievement_id: achievement.id,
        earned_at: earnedDate,
      })
      .returning()
      .execute();

    const result = await getUserAchievements(user.id);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: userAchievement.id,
      user_id: user.id,
      achievement_id: achievement.id,
      earned_at: earnedDate,
    });

    // Verify data types
    expect(typeof result[0].id).toBe('number');
    expect(typeof result[0].user_id).toBe('number');
    expect(typeof result[0].achievement_id).toBe('number');
    expect(result[0].earned_at).toBeInstanceOf(Date);
  });

  it('should handle multiple achievements with same timestamp correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpass',
      })
      .returning()
      .execute();

    // Create two achievements
    const achievements = await db.insert(achievementsTable)
      .values([
        {
          name: 'Achievement 1',
          description: 'First achievement',
          badge_icon: 'star',
          badge_color: '#FFD700',
          xp_reward: 50,
          unlock_criteria: 'test1',
          category: 'milestone',
        },
        {
          name: 'Achievement 2',
          description: 'Second achievement',
          badge_icon: 'trophy',
          badge_color: '#FF6B35',
          xp_reward: 100,
          unlock_criteria: 'test2',
          category: 'quiz_master',
        },
      ])
      .returning()
      .execute();

    const sameDate = new Date();

    // Add both achievements with same timestamp
    await db.insert(userAchievementsTable)
      .values([
        {
          user_id: user.id,
          achievement_id: achievements[0].id,
          earned_at: sameDate,
        },
        {
          user_id: user.id,
          achievement_id: achievements[1].id,
          earned_at: sameDate,
        },
      ])
      .execute();

    const result = await getUserAchievements(user.id);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[1].user_id).toEqual(user.id);
    expect(result[0].earned_at).toEqual(sameDate);
    expect(result[1].earned_at).toEqual(sameDate);
  });
});