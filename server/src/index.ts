import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  registerInputSchema, 
  loginInputSchema, 
  submitQuizInputSchema, 
  updateProgressInputSchema 
} from './schema';

// Import handlers
import { register } from './handlers/register';
import { login } from './handlers/login';
import { getCourses } from './handlers/get_courses';
import { getCourseById } from './handlers/get_course_by_id';
import { getLessonsByCourse } from './handlers/get_lessons_by_course';
import { getLessonById } from './handlers/get_lesson_by_id';
import { getQuizQuestions } from './handlers/get_quiz_questions';
import { submitQuiz } from './handlers/submit_quiz';
import { getUserProgress } from './handlers/get_user_progress';
import { updateProgress } from './handlers/update_progress';
import { getAchievements } from './handlers/get_achievements';
import { getUserAchievements } from './handlers/get_user_achievements';
import { getDashboardData } from './handlers/get_dashboard_data';
import { getUserProfileStats } from './handlers/get_user_profile_stats';
import { getCourseRoadmap } from './handlers/get_course_roadmap';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // Course routes
  getCourses: publicProcedure
    .query(() => getCourses()),

  getCourseById: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getCourseById(input.courseId)),

  getLessonsByCourse: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getLessonsByCourse(input.courseId)),

  getLessonById: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(({ input }) => getLessonById(input.lessonId)),

  // Quiz routes
  getQuizQuestions: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(({ input }) => getQuizQuestions(input.lessonId)),

  submitQuiz: publicProcedure
    .input(submitQuizInputSchema.extend({ userId: z.number() }))
    .mutation(({ input }) => submitQuiz(input.userId, {
      lesson_id: input.lesson_id,
      answers: input.answers,
    })),

  // Progress routes
  getUserProgress: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserProgress(input.userId)),

  updateProgress: publicProcedure
    .input(updateProgressInputSchema.extend({ userId: z.number() }))
    .mutation(({ input }) => updateProgress(input.userId, {
      course_id: input.course_id,
      lesson_id: input.lesson_id,
      status: input.status,
      completion_percentage: input.completion_percentage,
      xp_earned: input.xp_earned,
    })),

  // Achievement routes
  getAchievements: publicProcedure
    .query(() => getAchievements()),

  getUserAchievements: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserAchievements(input.userId)),

  // Dashboard and profile routes
  getDashboardData: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getDashboardData(input.userId)),

  getUserProfileStats: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserProfileStats(input.userId)),

  getCourseRoadmap: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCourseRoadmap(input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();