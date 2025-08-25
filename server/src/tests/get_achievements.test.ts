import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { achievementsTable } from '../db/schema';
import { getAchievements } from '../handlers/get_achievements';

describe('getAchievements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active achievements', async () => {
    // Create test achievements
    await db.insert(achievementsTable)
      .values([
        {
          name: 'First Steps',
          description: 'Complete your first lesson',
          badge_icon: '🎯',
          badge_color: '#4CAF50',
          xp_reward: 50,
          unlock_criteria: 'complete_first_lesson',
          category: 'milestone',
          is_active: true,
        },
        {
          name: 'Quiz Master',
          description: 'Score 100% on any quiz',
          badge_icon: '🏆',
          badge_color: '#FFD700',
          xp_reward: 100,
          unlock_criteria: 'perfect_quiz_score',
          category: 'quiz_master',
          is_active: true,
        },
      ])
      .execute();

    const results = await getAchievements();

    expect(results).toHaveLength(2);
    expect(results[0].name).toEqual('First Steps');
    expect(results[0].description).toEqual('Complete your first lesson');
    expect(results[0].badge_icon).toEqual('🎯');
    expect(results[0].badge_color).toEqual('#4CAF50');
    expect(results[0].xp_reward).toEqual(50);
    expect(results[0].unlock_criteria).toEqual('complete_first_lesson');
    expect(results[0].category).toEqual('milestone');
    expect(results[0].is_active).toEqual(true);
    expect(results[0].id).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should exclude inactive achievements', async () => {
    // Create both active and inactive achievements
    await db.insert(achievementsTable)
      .values([
        {
          name: 'Active Achievement',
          description: 'This is active',
          badge_icon: '✅',
          badge_color: '#4CAF50',
          xp_reward: 50,
          unlock_criteria: 'active_criteria',
          category: 'milestone',
          is_active: true,
        },
        {
          name: 'Inactive Achievement',
          description: 'This is inactive',
          badge_icon: '❌',
          badge_color: '#FF0000',
          xp_reward: 25,
          unlock_criteria: 'inactive_criteria',
          category: 'special',
          is_active: false,
        },
      ])
      .execute();

    const results = await getAchievements();

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Active Achievement');
    expect(results[0].is_active).toEqual(true);
  });

  it('should order achievements by category and creation date', async () => {
    // Create achievements with different categories and timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 10000); // 10 seconds earlier
    
    await db.insert(achievementsTable)
      .values([
        {
          name: 'Second Milestone',
          description: 'Second milestone achievement',
          badge_icon: '🎯',
          badge_color: '#4CAF50',
          xp_reward: 75,
          unlock_criteria: 'second_milestone',
          category: 'milestone',
          is_active: true,
        },
        {
          name: 'Quiz Achievement',
          description: 'Quiz related achievement',
          badge_icon: '🧠',
          badge_color: '#2196F3',
          xp_reward: 60,
          unlock_criteria: 'quiz_criteria',
          category: 'quiz_master',
          is_active: true,
        },
        {
          name: 'First Milestone',
          description: 'First milestone achievement',
          badge_icon: '⭐',
          badge_color: '#FFD700',
          xp_reward: 25,
          unlock_criteria: 'first_milestone',
          category: 'milestone',
          is_active: true,
        },
      ])
      .execute();

    const results = await getAchievements();

    expect(results).toHaveLength(3);
    
    // Should be ordered by category first (milestone comes before quiz_master alphabetically)
    expect(results[0].category).toEqual('milestone');
    expect(results[1].category).toEqual('milestone');
    expect(results[2].category).toEqual('quiz_master');
    
    // Within the same category, should be ordered by creation date
    expect(results[0].created_at <= results[1].created_at).toBe(true);
  });

  it('should return empty array when no active achievements exist', async () => {
    // Create only inactive achievements
    await db.insert(achievementsTable)
      .values([
        {
          name: 'Inactive Achievement',
          description: 'This is inactive',
          badge_icon: '❌',
          badge_color: '#FF0000',
          xp_reward: 25,
          unlock_criteria: 'inactive_criteria',
          category: 'special',
          is_active: false,
        },
      ])
      .execute();

    const results = await getAchievements();

    expect(results).toHaveLength(0);
  });

  it('should handle all achievement categories', async () => {
    // Create achievements for all categories
    await db.insert(achievementsTable)
      .values([
        {
          name: 'Milestone Achievement',
          description: 'Milestone category',
          badge_icon: '🎯',
          badge_color: '#4CAF50',
          xp_reward: 50,
          unlock_criteria: 'milestone_criteria',
          category: 'milestone',
          is_active: true,
        },
        {
          name: 'Quiz Master Achievement',
          description: 'Quiz master category',
          badge_icon: '🏆',
          badge_color: '#FFD700',
          xp_reward: 100,
          unlock_criteria: 'quiz_master_criteria',
          category: 'quiz_master',
          is_active: true,
        },
        {
          name: 'Streak Achievement',
          description: 'Streak category',
          badge_icon: '🔥',
          badge_color: '#FF5722',
          xp_reward: 75,
          unlock_criteria: 'streak_criteria',
          category: 'streak',
          is_active: true,
        },
        {
          name: 'Course Completion Achievement',
          description: 'Course completion category',
          badge_icon: '📚',
          badge_color: '#9C27B0',
          xp_reward: 200,
          unlock_criteria: 'course_completion_criteria',
          category: 'course_completion',
          is_active: true,
        },
        {
          name: 'Special Achievement',
          description: 'Special category',
          badge_icon: '⭐',
          badge_color: '#E91E63',
          xp_reward: 300,
          unlock_criteria: 'special_criteria',
          category: 'special',
          is_active: true,
        },
      ])
      .execute();

    const results = await getAchievements();

    expect(results).toHaveLength(5);
    
    const categories = results.map(achievement => achievement.category);
    expect(categories).toContain('milestone');
    expect(categories).toContain('quiz_master');
    expect(categories).toContain('streak');
    expect(categories).toContain('course_completion');
    expect(categories).toContain('special');
  });

  it('should return achievements with all required fields', async () => {
    await db.insert(achievementsTable)
      .values([
        {
          name: 'Complete Achievement',
          description: 'Achievement with all fields',
          badge_icon: '🎉',
          badge_color: '#673AB7',
          xp_reward: 150,
          unlock_criteria: 'complete_criteria',
          category: 'milestone',
          is_active: true,
        },
      ])
      .execute();

    const results = await getAchievements();

    expect(results).toHaveLength(1);
    const achievement = results[0];
    
    // Verify all required fields are present and have correct types
    expect(typeof achievement.id).toBe('number');
    expect(typeof achievement.name).toBe('string');
    expect(typeof achievement.description).toBe('string');
    expect(typeof achievement.badge_icon).toBe('string');
    expect(typeof achievement.badge_color).toBe('string');
    expect(typeof achievement.xp_reward).toBe('number');
    expect(typeof achievement.unlock_criteria).toBe('string');
    expect(typeof achievement.category).toBe('string');
    expect(typeof achievement.is_active).toBe('boolean');
    expect(achievement.created_at).toBeInstanceOf(Date);
    
    // Verify specific values
    expect(achievement.name).toEqual('Complete Achievement');
    expect(achievement.description).toEqual('Achievement with all fields');
    expect(achievement.badge_icon).toEqual('🎉');
    expect(achievement.badge_color).toEqual('#673AB7');
    expect(achievement.xp_reward).toEqual(150);
    expect(achievement.unlock_criteria).toEqual('complete_criteria');
    expect(achievement.category).toEqual('milestone');
    expect(achievement.is_active).toEqual(true);
  });
});