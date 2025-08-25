import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  lessonsTable, 
  achievementsTable,
  userAchievementsTable,
  userProgressTable
} from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return dashboard data for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        total_xp: 250,
        current_level: 3,
        avatar_url: 'https://example.com/avatar.jpg'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test courses
    const courseResult = await db.insert(coursesTable)
      .values([
        {
          title: 'JavaScript Basics',
          description: 'Learn the fundamentals of JavaScript',
          difficulty_level: 'beginner',
          estimated_duration_hours: 5,
          is_published: true,
          order_index: 1
        },
        {
          title: 'Advanced JavaScript',
          description: 'Deep dive into JavaScript concepts',
          difficulty_level: 'advanced',
          estimated_duration_hours: 8,
          is_published: true,
          order_index: 2
        }
      ])
      .returning()
      .execute();

    const course1Id = courseResult[0].id;
    const course2Id = courseResult[1].id;

    // Create test lessons
    const lessonResult = await db.insert(lessonsTable)
      .values([
        {
          course_id: course1Id,
          title: 'Variables and Constants',
          content: 'Learn about variables and constants in JavaScript',
          code_template: 'let x = 5;',
          programming_language: 'javascript',
          xp_reward: 10,
          order_index: 1,
          is_published: true
        },
        {
          course_id: course1Id,
          title: 'Functions',
          content: 'Learn about functions in JavaScript',
          code_template: 'function greet() {}',
          programming_language: 'javascript',
          xp_reward: 15,
          order_index: 2,
          is_published: true
        },
        {
          course_id: course2Id,
          title: 'Async Programming',
          content: 'Learn about async/await',
          xp_reward: 20,
          order_index: 1,
          is_published: true
        }
      ])
      .returning()
      .execute();

    // Create test achievement
    const achievementResult = await db.insert(achievementsTable)
      .values({
        name: 'First Steps',
        description: 'Complete your first lesson',
        badge_icon: 'star',
        badge_color: 'gold',
        xp_reward: 50,
        unlock_criteria: 'complete_lesson',
        category: 'milestone'
      })
      .returning()
      .execute();

    // Create user achievement
    await db.insert(userAchievementsTable)
      .values({
        user_id: userId,
        achievement_id: achievementResult[0].id
      })
      .execute();

    // Create user progress
    await db.insert(userProgressTable)
      .values({
        user_id: userId,
        course_id: course1Id,
        status: 'in_progress',
        completion_percentage: 50,
        xp_earned: 25
      })
      .execute();

    const result = await getDashboardData(userId);

    // Verify user data
    expect(result.user.id).toEqual(userId);
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.username).toEqual('testuser');
    expect(result.user.total_xp).toEqual(250);
    expect(result.user.current_level).toEqual(3);
    expect(result.user.avatar_url).toEqual('https://example.com/avatar.jpg');

    // Verify recent achievements
    expect(result.recentAchievements).toHaveLength(1);
    expect(result.recentAchievements[0].user_id).toEqual(userId);
    expect(result.recentAchievements[0].achievement_id).toEqual(achievementResult[0].id);

    // Verify overall progress
    expect(result.overallProgress.totalCourses).toEqual(2);
    expect(result.overallProgress.completedCourses).toEqual(0);
    expect(result.overallProgress.inProgressCourses).toEqual(1);
    expect(result.overallProgress.totalXp).toEqual(250);
    expect(result.overallProgress.currentLevel).toEqual(3);

    // Verify recommended lessons
    expect(result.recommendedLessons.length).toBeGreaterThan(0);
    expect(result.recommendedLessons[0].is_published).toBe(true);
  });

  it('should handle user with no achievements', async () => {
    // Create test user without achievements
    const userResult = await db.insert(usersTable)
      .values({
        email: 'noachievements@example.com',
        username: 'noachievements',
        password_hash: 'hashedpassword',
        total_xp: 0,
        current_level: 1
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getDashboardData(userId);

    expect(result.user.id).toEqual(userId);
    expect(result.recentAchievements).toHaveLength(0);
    expect(result.overallProgress.totalCourses).toEqual(0);
    expect(result.overallProgress.completedCourses).toEqual(0);
    expect(result.overallProgress.inProgressCourses).toEqual(0);
  });

  it('should only return published lessons and courses', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        username: 'testuser2',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create published and unpublished courses
    const courseResult = await db.insert(coursesTable)
      .values([
        {
          title: 'Published Course',
          description: 'This is published',
          difficulty_level: 'beginner',
          estimated_duration_hours: 5,
          is_published: true,
          order_index: 1
        },
        {
          title: 'Unpublished Course',
          description: 'This is not published',
          difficulty_level: 'beginner',
          estimated_duration_hours: 5,
          is_published: false,
          order_index: 2
        }
      ])
      .returning()
      .execute();

    const publishedCourseId = courseResult[0].id;
    const unpublishedCourseId = courseResult[1].id;

    // Create lessons for both courses
    await db.insert(lessonsTable)
      .values([
        {
          course_id: publishedCourseId,
          title: 'Published Lesson',
          content: 'Published content',
          xp_reward: 10,
          order_index: 1,
          is_published: true
        },
        {
          course_id: unpublishedCourseId,
          title: 'Unpublished Lesson',
          content: 'Unpublished content',
          xp_reward: 10,
          order_index: 1,
          is_published: false
        }
      ])
      .execute();

    const result = await getDashboardData(userId);

    // Should only count published course
    expect(result.overallProgress.totalCourses).toEqual(1);
    
    // Should only include published lessons
    const lessonTitles = result.recommendedLessons.map(lesson => lesson.title);
    expect(lessonTitles).toContain('Published Lesson');
    expect(lessonTitles).not.toContain('Unpublished Lesson');
  });

  it('should limit recommended lessons to 3', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test3@example.com',
        username: 'testuser3',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Many Lessons Course',
        description: 'Course with many lessons',
        difficulty_level: 'beginner',
        estimated_duration_hours: 10,
        is_published: true,
        order_index: 1
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create 5 lessons
    await db.insert(lessonsTable)
      .values([
        {
          course_id: courseId,
          title: 'Lesson 1',
          content: 'Content 1',
          xp_reward: 10,
          order_index: 1,
          is_published: true
        },
        {
          course_id: courseId,
          title: 'Lesson 2',
          content: 'Content 2',
          xp_reward: 10,
          order_index: 2,
          is_published: true
        },
        {
          course_id: courseId,
          title: 'Lesson 3',
          content: 'Content 3',
          xp_reward: 10,
          order_index: 3,
          is_published: true
        },
        {
          course_id: courseId,
          title: 'Lesson 4',
          content: 'Content 4',
          xp_reward: 10,
          order_index: 4,
          is_published: true
        },
        {
          course_id: courseId,
          title: 'Lesson 5',
          content: 'Content 5',
          xp_reward: 10,
          order_index: 5,
          is_published: true
        }
      ])
      .execute();

    const result = await getDashboardData(userId);

    // Should limit to 3 lessons
    expect(result.recommendedLessons).toHaveLength(3);
    
    // Should be ordered by course order_index, then lesson order_index
    expect(result.recommendedLessons[0].title).toEqual('Lesson 1');
    expect(result.recommendedLessons[1].title).toEqual('Lesson 2');
    expect(result.recommendedLessons[2].title).toEqual('Lesson 3');
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(getDashboardData(nonExistentUserId))
      .rejects.toThrow(/User with id 99999 not found/);
  });

  it('should limit recent achievements to 5', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'achievements@example.com',
        username: 'achievementuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create 7 achievements
    const achievementResults = await db.insert(achievementsTable)
      .values([
        { name: 'Achievement 1', description: 'First achievement', badge_icon: 'star', badge_color: 'gold', xp_reward: 10, unlock_criteria: 'test', category: 'milestone' },
        { name: 'Achievement 2', description: 'Second achievement', badge_icon: 'star', badge_color: 'gold', xp_reward: 10, unlock_criteria: 'test', category: 'milestone' },
        { name: 'Achievement 3', description: 'Third achievement', badge_icon: 'star', badge_color: 'gold', xp_reward: 10, unlock_criteria: 'test', category: 'milestone' },
        { name: 'Achievement 4', description: 'Fourth achievement', badge_icon: 'star', badge_color: 'gold', xp_reward: 10, unlock_criteria: 'test', category: 'milestone' },
        { name: 'Achievement 5', description: 'Fifth achievement', badge_icon: 'star', badge_color: 'gold', xp_reward: 10, unlock_criteria: 'test', category: 'milestone' },
        { name: 'Achievement 6', description: 'Sixth achievement', badge_icon: 'star', badge_color: 'gold', xp_reward: 10, unlock_criteria: 'test', category: 'milestone' },
        { name: 'Achievement 7', description: 'Seventh achievement', badge_icon: 'star', badge_color: 'gold', xp_reward: 10, unlock_criteria: 'test', category: 'milestone' }
      ])
      .returning()
      .execute();

    // Create user achievements with different timestamps
    const baseTime = Date.now();
    for (let i = 0; i < 7; i++) {
      await db.insert(userAchievementsTable)
        .values({
          user_id: userId,
          achievement_id: achievementResults[i].id,
          earned_at: new Date(baseTime - (i * 86400000)) // Each one day apart
        })
        .execute();
    }

    const result = await getDashboardData(userId);

    // Should limit to 5 most recent achievements
    expect(result.recentAchievements).toHaveLength(5);
    
    // Should be ordered by most recent first
    expect(result.recentAchievements[0].earned_at.getTime()).toBeGreaterThan(
      result.recentAchievements[1].earned_at.getTime()
    );
  });
});