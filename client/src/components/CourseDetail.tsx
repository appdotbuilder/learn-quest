import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Clock, 
  BookOpen, 
  PlayCircle, 
  CheckCircle2, 
  Zap, 
  Star,
  Trophy,
  Lock
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Course, Lesson, UserProgress } from '../../../server/src/schema';

interface CourseDetailProps {
  courseId: number;
  user: User;
  onLessonSelect: (lessonId: number) => void;
  onBack: () => void;
}

interface LessonWithProgress extends Lesson {
  isCompleted?: boolean;
  isUnlocked?: boolean;
}

export function CourseDetail({ courseId, user, onLessonSelect, onBack }: CourseDetailProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [courseData, lessonsData, progressData] = await Promise.all([
        trpc.getCourseById.query({ courseId }),
        trpc.getLessonsByCourse.query({ courseId }),
        trpc.getUserProgress.query({ userId: user.id })
      ]);
      
      setCourse(courseData);
      setLessons(lessonsData);
      setUserProgress(progressData);
    } catch (error: any) {
      setError(error.message || 'Failed to load course details');
      console.error('Course detail error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCourseProgress = () => {
    return userProgress.find((p: UserProgress) => p.course_id === courseId);
  };

  const getLessonsWithProgress = (): LessonWithProgress[] => {
    return lessons.map((lesson: Lesson, index: number) => {
      // For this demo, all lessons are unlocked for simplicity
      // In a real app, you'd check if prerequisites are met
      const isUnlocked = true;
      const isCompleted = false; // TODO: Check if lesson is completed
      
      return {
        ...lesson,
        isCompleted,
        isUnlocked
      };
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400';
      case 'advanced': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTotalXP = () => {
    return lessons.reduce((total: number, lesson: Lesson) => total + lesson.xp_reward, 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-64 glass-card rounded-lg animate-pulse"></div>
          <div className="h-96 glass-card rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="glass-card border-0">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-400 mb-2">Failed to load course</div>
              <Button onClick={loadData} variant="outline" className="btn-secondary">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const courseProgress = getCourseProgress();
  const lessonsWithProgress = getLessonsWithProgress();
  const totalXP = getTotalXP();
  const completedLessons = lessonsWithProgress.filter((l: LessonWithProgress) => l.isCompleted).length;
  const completionPercentage = lessons.length > 0 ? (completedLessons / lessons.length) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8 relative z-10">
      {/* Back Button */}
      <Button 
        onClick={onBack}
        variant="ghost" 
        className="mb-6 text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Courses
      </Button>

      {/* Course Header */}
      <Card className="glass-card border-0 mb-6">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">{course.title}</h1>
                  <div className="flex items-center space-x-3 mt-2">
                    <Badge 
                      variant="secondary" 
                      className={getDifficultyColor(course.difficulty_level)}
                    >
                      {course.difficulty_level}
                    </Badge>
                    <div className="flex items-center space-x-1 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{course.estimated_duration_hours} hours</span>
                    </div>
                    <div className="flex items-center space-x-1 text-yellow-400">
                      <Zap className="w-4 h-4" />
                      <span>{totalXP} XP total</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-400 text-lg leading-relaxed">
                {course.description}
              </p>
            </div>

            <div className="lg:w-80 space-y-4">
              {/* Progress Card */}
              <div className="glass-card-light p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Your Progress</span>
                  <span className="text-sm text-yellow-400 font-medium">
                    {Math.round(completionPercentage)}%
                  </span>
                </div>
                <Progress value={completionPercentage} className="h-3 progress-bar mb-3" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {completedLessons} of {lessons.length} lessons
                  </span>
                  <span className="text-yellow-400">
                    {courseProgress?.xp_earned || 0} XP earned
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card-light p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-400">{lessons.length}</div>
                  <div className="text-xs text-gray-400">Lessons</div>
                </div>
                <div className="glass-card-light p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-400">{totalXP}</div>
                  <div className="text-xs text-gray-400">Total XP</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons List */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <PlayCircle className="w-5 h-5 text-blue-400" />
            <span>Course Content</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400">No lessons available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessonsWithProgress.map((lesson: LessonWithProgress, index: number) => (
                <div
                  key={lesson.id}
                  className={`flex items-center justify-between p-4 glass-card-light rounded-lg transition-all duration-200 ${
                    lesson.isUnlocked 
                      ? 'hover:bg-opacity-60 cursor-pointer group' 
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => lesson.isUnlocked && onLessonSelect(lesson.id)}
                >
                  <div className="flex items-center space-x-4">
                    {/* Lesson Number */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      lesson.isCompleted
                        ? 'bg-green-500 text-white'
                        : lesson.isUnlocked
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-gray-600 text-gray-400'
                    }`}>
                      {lesson.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : lesson.isUnlocked ? (
                        index + 1
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                    </div>

                    {/* Lesson Info */}
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        lesson.isUnlocked ? 'text-white group-hover:text-yellow-400' : 'text-gray-500'
                      } transition-colors`}>
                        {lesson.title}
                      </h3>
                      <div className="flex items-center space-x-3 mt-1">
                        {lesson.programming_language && (
                          <Badge variant="secondary" className="text-xs">
                            {lesson.programming_language}
                          </Badge>
                        )}
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          <Zap className="w-3 h-3" />
                          <span>{lesson.xp_reward} XP</span>
                        </div>
                        {lesson.isCompleted && (
                          <div className="flex items-center space-x-1 text-xs text-green-400">
                            <Star className="w-3 h-3" />
                            <span>Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Icon */}
                  {lesson.isUnlocked && (
                    <div className="text-gray-400 group-hover:text-yellow-400 transition-colors">
                      {lesson.isCompleted ? (
                        <Trophy className="w-5 h-5" />
                      ) : (
                        <PlayCircle className="w-5 h-5" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}