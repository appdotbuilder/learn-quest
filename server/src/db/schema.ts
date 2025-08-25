import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer, 
  boolean, 
  pgEnum,
  json,
  real
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const difficultyLevelEnum = pgEnum('difficulty_level', ['beginner', 'intermediate', 'advanced']);
export const progressStatusEnum = pgEnum('progress_status', ['not_started', 'in_progress', 'completed']);
export const achievementCategoryEnum = pgEnum('achievement_category', ['milestone', 'quiz_master', 'streak', 'course_completion', 'special']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  total_xp: integer('total_xp').notNull().default(0),
  current_level: integer('current_level').notNull().default(1),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Courses table
export const coursesTable = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  difficulty_level: difficultyLevelEnum('difficulty_level').notNull(),
  estimated_duration_hours: real('estimated_duration_hours').notNull(),
  thumbnail_url: text('thumbnail_url'),
  is_published: boolean('is_published').notNull().default(false),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Lessons table
export const lessonsTable = pgTable('lessons', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  code_template: text('code_template'),
  programming_language: text('programming_language'),
  xp_reward: integer('xp_reward').notNull().default(10),
  order_index: integer('order_index').notNull().default(0),
  is_published: boolean('is_published').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Quiz questions table
export const quizQuestionsTable = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  lesson_id: integer('lesson_id').notNull(),
  question_text: text('question_text').notNull(),
  options: json('options').$type<string[]>().notNull(),
  correct_answer_index: integer('correct_answer_index').notNull(),
  explanation: text('explanation'),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Quiz submissions table
export const quizSubmissionsTable = pgTable('quiz_submissions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  lesson_id: integer('lesson_id').notNull(),
  answers: json('answers').$type<number[]>().notNull(),
  score: real('score').notNull(),
  completed_at: timestamp('completed_at').defaultNow().notNull(),
});

// User progress table
export const userProgressTable = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  course_id: integer('course_id').notNull(),
  lesson_id: integer('lesson_id'),
  status: progressStatusEnum('status').notNull().default('not_started'),
  completion_percentage: real('completion_percentage').notNull().default(0),
  xp_earned: integer('xp_earned').notNull().default(0),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Achievements table
export const achievementsTable = pgTable('achievements', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  badge_icon: text('badge_icon').notNull(),
  badge_color: text('badge_color').notNull(),
  xp_reward: integer('xp_reward').notNull().default(0),
  unlock_criteria: text('unlock_criteria').notNull(),
  category: achievementCategoryEnum('category').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// User achievements table
export const userAchievementsTable = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  achievement_id: integer('achievement_id').notNull(),
  earned_at: timestamp('earned_at').defaultNow().notNull(),
});

// Course prerequisites table
export const coursePrerequisitesTable = pgTable('course_prerequisites', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull(),
  prerequisite_course_id: integer('prerequisite_course_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  progress: many(userProgressTable),
  achievements: many(userAchievementsTable),
  quizSubmissions: many(quizSubmissionsTable),
}));

export const coursesRelations = relations(coursesTable, ({ many }) => ({
  lessons: many(lessonsTable),
  progress: many(userProgressTable),
  prerequisites: many(coursePrerequisitesTable, { relationName: 'coursePrerequisites' }),
  requiredBy: many(coursePrerequisitesTable, { relationName: 'prerequisiteCourses' }),
}));

export const lessonsRelations = relations(lessonsTable, ({ one, many }) => ({
  course: one(coursesTable, {
    fields: [lessonsTable.course_id],
    references: [coursesTable.id],
  }),
  quizQuestions: many(quizQuestionsTable),
  quizSubmissions: many(quizSubmissionsTable),
}));

export const quizQuestionsRelations = relations(quizQuestionsTable, ({ one }) => ({
  lesson: one(lessonsTable, {
    fields: [quizQuestionsTable.lesson_id],
    references: [lessonsTable.id],
  }),
}));

export const quizSubmissionsRelations = relations(quizSubmissionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [quizSubmissionsTable.user_id],
    references: [usersTable.id],
  }),
  lesson: one(lessonsTable, {
    fields: [quizSubmissionsTable.lesson_id],
    references: [lessonsTable.id],
  }),
}));

export const userProgressRelations = relations(userProgressTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userProgressTable.user_id],
    references: [usersTable.id],
  }),
  course: one(coursesTable, {
    fields: [userProgressTable.course_id],
    references: [coursesTable.id],
  }),
  lesson: one(lessonsTable, {
    fields: [userProgressTable.lesson_id],
    references: [lessonsTable.id],
  }),
}));

export const achievementsRelations = relations(achievementsTable, ({ many }) => ({
  userAchievements: many(userAchievementsTable),
}));

export const userAchievementsRelations = relations(userAchievementsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userAchievementsTable.user_id],
    references: [usersTable.id],
  }),
  achievement: one(achievementsTable, {
    fields: [userAchievementsTable.achievement_id],
    references: [achievementsTable.id],
  }),
}));

export const coursePrerequisitesRelations = relations(coursePrerequisitesTable, ({ one }) => ({
  course: one(coursesTable, {
    fields: [coursePrerequisitesTable.course_id],
    references: [coursesTable.id],
    relationName: 'coursePrerequisites',
  }),
  prerequisite: one(coursesTable, {
    fields: [coursePrerequisitesTable.prerequisite_course_id],
    references: [coursesTable.id],
    relationName: 'prerequisiteCourses',
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  courses: coursesTable,
  lessons: lessonsTable,
  quizQuestions: quizQuestionsTable,
  quizSubmissions: quizSubmissionsTable,
  userProgress: userProgressTable,
  achievements: achievementsTable,
  userAchievements: userAchievementsTable,
  coursePrerequisites: coursePrerequisitesTable,
};