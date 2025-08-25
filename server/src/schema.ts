import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  password_hash: z.string(),
  total_xp: z.number().int().nonnegative(),
  current_level: z.number().int().nonnegative(),
  avatar_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

// Auth schemas
export const registerInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Course schema
export const courseSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
  estimated_duration_hours: z.number().positive(),
  thumbnail_url: z.string().nullable(),
  is_published: z.boolean(),
  order_index: z.number().int().nonnegative(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Course = z.infer<typeof courseSchema>;

export const createCourseInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
  estimated_duration_hours: z.number().positive(),
  thumbnail_url: z.string().nullable().optional(),
  order_index: z.number().int().nonnegative(),
});

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

// Lesson schema
export const lessonSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  title: z.string(),
  content: z.string(),
  code_template: z.string().nullable(),
  programming_language: z.string().nullable(),
  xp_reward: z.number().int().nonnegative(),
  order_index: z.number().int().nonnegative(),
  is_published: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Lesson = z.infer<typeof lessonSchema>;

export const createLessonInputSchema = z.object({
  course_id: z.number(),
  title: z.string().min(1).max(255),
  content: z.string(),
  code_template: z.string().nullable().optional(),
  programming_language: z.string().nullable().optional(),
  xp_reward: z.number().int().nonnegative(),
  order_index: z.number().int().nonnegative(),
});

export type CreateLessonInput = z.infer<typeof createLessonInputSchema>;

// Quiz schema
export const quizQuestionSchema = z.object({
  id: z.number(),
  lesson_id: z.number(),
  question_text: z.string(),
  options: z.array(z.string()),
  correct_answer_index: z.number().int().nonnegative(),
  explanation: z.string().nullable(),
  order_index: z.number().int().nonnegative(),
  created_at: z.coerce.date(),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const createQuizQuestionInputSchema = z.object({
  lesson_id: z.number(),
  question_text: z.string(),
  options: z.array(z.string()).min(2).max(6),
  correct_answer_index: z.number().int().nonnegative(),
  explanation: z.string().nullable().optional(),
  order_index: z.number().int().nonnegative(),
});

export type CreateQuizQuestionInput = z.infer<typeof createQuizQuestionInputSchema>;

// Quiz submission schema
export const quizSubmissionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  lesson_id: z.number(),
  answers: z.array(z.number().int()),
  score: z.number().min(0).max(1),
  completed_at: z.coerce.date(),
});

export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;

export const submitQuizInputSchema = z.object({
  lesson_id: z.number(),
  answers: z.array(z.number().int()),
});

export type SubmitQuizInput = z.infer<typeof submitQuizInputSchema>;

// User progress schema
export const userProgressSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  course_id: z.number(),
  lesson_id: z.number().nullable(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  completion_percentage: z.number().min(0).max(100),
  xp_earned: z.number().int().nonnegative(),
  started_at: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable(),
  updated_at: z.coerce.date(),
});

export type UserProgress = z.infer<typeof userProgressSchema>;

export const updateProgressInputSchema = z.object({
  course_id: z.number(),
  lesson_id: z.number().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  completion_percentage: z.number().min(0).max(100),
  xp_earned: z.number().int().nonnegative().optional(),
});

export type UpdateProgressInput = z.infer<typeof updateProgressInputSchema>;

// Achievement schema
export const achievementSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  badge_icon: z.string(),
  badge_color: z.string(),
  xp_reward: z.number().int().nonnegative(),
  unlock_criteria: z.string(),
  category: z.enum(['milestone', 'quiz_master', 'streak', 'course_completion', 'special']),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
});

export type Achievement = z.infer<typeof achievementSchema>;

export const createAchievementInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string(),
  badge_icon: z.string(),
  badge_color: z.string(),
  xp_reward: z.number().int().nonnegative(),
  unlock_criteria: z.string(),
  category: z.enum(['milestone', 'quiz_master', 'streak', 'course_completion', 'special']),
});

export type CreateAchievementInput = z.infer<typeof createAchievementInputSchema>;

// User achievement schema
export const userAchievementSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  achievement_id: z.number(),
  earned_at: z.coerce.date(),
});

export type UserAchievement = z.infer<typeof userAchievementSchema>;

// Course prerequisite schema
export const coursePrerequisiteSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  prerequisite_course_id: z.number(),
  created_at: z.coerce.date(),
});

export type CoursePrerequisite = z.infer<typeof coursePrerequisiteSchema>;

export const addPrerequisiteInputSchema = z.object({
  course_id: z.number(),
  prerequisite_course_id: z.number(),
});

export type AddPrerequisiteInput = z.infer<typeof addPrerequisiteInputSchema>;

// Dashboard data schema
export const dashboardDataSchema = z.object({
  user: userSchema,
  recentAchievements: z.array(userAchievementSchema),
  overallProgress: z.object({
    totalCourses: z.number().int(),
    completedCourses: z.number().int(),
    inProgressCourses: z.number().int(),
    totalXp: z.number().int(),
    currentLevel: z.number().int(),
  }),
  recommendedLessons: z.array(lessonSchema),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// User profile stats schema
export const userProfileStatsSchema = z.object({
  user: userSchema,
  achievements: z.array(userAchievementSchema),
  statistics: z.object({
    totalLessonsCompleted: z.number().int(),
    totalQuizzesTaken: z.number().int(),
    averageQuizScore: z.number().min(0).max(1),
    currentStreak: z.number().int(),
    longestStreak: z.number().int(),
    totalXpEarned: z.number().int(),
    coursesCompleted: z.number().int(),
  }),
  progressHistory: z.array(z.object({
    date: z.coerce.date(),
    xpGained: z.number().int(),
    lessonsCompleted: z.number().int(),
  })),
});

export type UserProfileStats = z.infer<typeof userProfileStatsSchema>;