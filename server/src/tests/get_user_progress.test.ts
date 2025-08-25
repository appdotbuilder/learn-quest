import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, userProgressTable } from '../db/schema';
import { getUserProgress } from '../handlers/get_user_progress';

describe('getUserProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no progress', async () => {
    // Create a user with no progress records
    const users = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const result = await getUserProgress(users[0].id);

    expect(result).toEqual([]);
  });

  it('should fetch all progress records for a specific user', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test course
    const courses = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        difficulty_level: 'beginner',
        estimated_duration_hours: 2.0,
        order_index: 1
      })
      .returning()
      .execute();
    const courseId = courses[0].id;

    // Create test lessons
    const lessons = await db.insert(lessonsTable)
      .values([
        {
          course_id: courseId,
          title: 'Lesson 1',
          content: 'Content 1',
          xp_reward: 10,
          order_index: 1
        },
        {
          course_id: courseId,
          title: 'Lesson 2',
          content: 'Content 2',
          xp_reward: 15,
          order_index: 2
        }
      ])
      .returning()
      .execute();

    // Create progress records
    const progressData = [
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessons[0].id,
        status: 'completed' as const,
        completion_percentage: 100.0,
        xp_earned: 10,
        started_at: new Date(Date.now() - 86400000), // Yesterday
        completed_at: new Date()
      },
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessons[1].id,
        status: 'in_progress' as const,
        completion_percentage: 75.5,
        xp_earned: 0,
        started_at: new Date(),
        completed_at: null
      }
    ];

    await db.insert(userProgressTable)
      .values(progressData)
      .execute();

    const result = await getUserProgress(userId);

    expect(result).toHaveLength(2);
    
    // Verify first progress record
    const completedProgress = result.find(p => p.status === 'completed');
    expect(completedProgress).toBeDefined();
    expect(completedProgress!.user_id).toBe(userId);
    expect(completedProgress!.course_id).toBe(courseId);
    expect(completedProgress!.lesson_id).toBe(lessons[0].id);
    expect(completedProgress!.completion_percentage).toBe(100);
    expect(typeof completedProgress!.completion_percentage).toBe('number');
    expect(completedProgress!.xp_earned).toBe(10);
    expect(completedProgress!.started_at).toBeInstanceOf(Date);
    expect(completedProgress!.completed_at).toBeInstanceOf(Date);

    // Verify second progress record
    const inProgressRecord = result.find(p => p.status === 'in_progress');
    expect(inProgressRecord).toBeDefined();
    expect(inProgressRecord!.user_id).toBe(userId);
    expect(inProgressRecord!.course_id).toBe(courseId);
    expect(inProgressRecord!.lesson_id).toBe(lessons[1].id);
    expect(inProgressRecord!.completion_percentage).toBe(75.5);
    expect(typeof inProgressRecord!.completion_percentage).toBe('number');
    expect(inProgressRecord!.xp_earned).toBe(0);
    expect(inProgressRecord!.started_at).toBeInstanceOf(Date);
    expect(inProgressRecord!.completed_at).toBe(null);
  });

  it('should return only progress for the specified user', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          password_hash: 'hashedpassword1'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          password_hash: 'hashedpassword2'
        }
      ])
      .returning()
      .execute();

    // Create test course
    const courses = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        difficulty_level: 'intermediate',
        estimated_duration_hours: 3.0,
        order_index: 1
      })
      .returning()
      .execute();
    const courseId = courses[0].id;

    // Create progress records for both users
    await db.insert(userProgressTable)
      .values([
        {
          user_id: users[0].id,
          course_id: courseId,
          lesson_id: null,
          status: 'in_progress',
          completion_percentage: 50.0,
          xp_earned: 25
        },
        {
          user_id: users[1].id,
          course_id: courseId,
          lesson_id: null,
          status: 'completed',
          completion_percentage: 100.0,
          xp_earned: 50
        }
      ])
      .execute();

    // Get progress for first user only
    const result = await getUserProgress(users[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(users[0].id);
    expect(result[0].status).toBe('in_progress');
    expect(result[0].completion_percentage).toBe(50);
    expect(result[0].xp_earned).toBe(25);
  });

  it('should handle course-level progress records (without lesson_id)', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test course
    const courses = await db.insert(coursesTable)
      .values({
        title: 'Course Progress Test',
        description: 'Testing course-level progress',
        difficulty_level: 'advanced',
        estimated_duration_hours: 5.0,
        order_index: 1
      })
      .returning()
      .execute();
    const courseId = courses[0].id;

    // Create course-level progress (no specific lesson)
    await db.insert(userProgressTable)
      .values({
        user_id: userId,
        course_id: courseId,
        lesson_id: null,
        status: 'not_started',
        completion_percentage: 0.0,
        xp_earned: 0
      })
      .execute();

    const result = await getUserProgress(userId);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(userId);
    expect(result[0].course_id).toBe(courseId);
    expect(result[0].lesson_id).toBe(null);
    expect(result[0].status).toBe('not_started');
    expect(result[0].completion_percentage).toBe(0);
    expect(result[0].xp_earned).toBe(0);
  });

  it('should handle numeric conversion correctly for completion percentage', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test course
    const courses = await db.insert(coursesTable)
      .values({
        title: 'Numeric Test Course',
        description: 'Testing numeric conversion',
        difficulty_level: 'beginner',
        estimated_duration_hours: 1.0,
        order_index: 1
      })
      .returning()
      .execute();
    const courseId = courses[0].id;

    // Create progress with various completion percentages
    const testPercentages = [0, 25.5, 50.0, 75.25, 100];
    
    for (let i = 0; i < testPercentages.length; i++) {
      await db.insert(userProgressTable)
        .values({
          user_id: userId,
          course_id: courseId,
          lesson_id: null,
          status: testPercentages[i] === 100 ? 'completed' : 'in_progress',
          completion_percentage: testPercentages[i],
          xp_earned: Math.floor(testPercentages[i])
        })
        .execute();
    }

    const result = await getUserProgress(userId);

    expect(result).toHaveLength(5);
    
    // Verify all completion percentages are numbers and match expected values
    const percentages = result.map(p => p.completion_percentage).sort((a, b) => a - b);
    expect(percentages).toEqual([0, 25.5, 50, 75.25, 100]);
    
    // Verify they are actual numbers
    result.forEach(progress => {
      expect(typeof progress.completion_percentage).toBe('number');
    });
  });
});