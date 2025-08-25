import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Map, 
  Lock, 
  CheckCircle2, 
  PlayCircle, 
  ArrowDown, 
  BookOpen,
  Clock,
  Zap,
  Star
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Course, UserProgress } from '../../../server/src/schema';

interface CourseRoadmapProps {
  user: User;
  onCourseSelect: (courseId: number) => void;
}

interface CourseWithProgress extends Course {
  progress?: UserProgress;
  isUnlocked: boolean;
  prerequisites: Course[];
}

export function CourseRoadmap({ user, onCourseSelect }: CourseRoadmapProps) {
  const [roadmapData, setRoadmapData] = useState<CourseWithProgress[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoadmapData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // For this demo, we'll load courses and progress separately
      // In a real implementation, the server would handle roadmap logic
      const [courses, userProgress] = await Promise.all([
        trpc.getCourses.query(),
        trpc.getUserProgress.query({ userId: user.id })
      ]);

      // Simple roadmap logic - courses ordered by difficulty and order_index
      const sortedCourses = courses.sort((a: Course, b: Course) => {
        const difficultyOrder = { 'beginner': 0, 'intermediate': 1, 'advanced': 2 };
        const aDiff = difficultyOrder[a.difficulty_level as keyof typeof difficultyOrder] || 0;
        const bDiff = difficultyOrder[b.difficulty_level as keyof typeof difficultyOrder] || 0;
        
        if (aDiff !== bDiff) return aDiff - bDiff;
        return a.order_index - b.order_index;
      });

      // Create roadmap with progress and unlock status
      const roadmap: CourseWithProgress[] = sortedCourses.map((course: Course, index: number) => {
        const progress = userProgress.find((p: UserProgress) => p.course_id === course.id);
        
        // Simple unlock logic: first course is always unlocked, others unlock based on previous completion
        let isUnlocked = index === 0;
        
        if (index > 0) {
          const previousCourseProgress = userProgress.find((p: UserProgress) => 
            p.course_id === sortedCourses[index - 1].id
          );
          isUnlocked = previousCourseProgress?.status === 'completed';
        }

        return {
          ...course,
          progress,
          isUnlocked,
          prerequisites: index > 0 ? [sortedCourses[index - 1]] : []
        };
      });

      setRoadmapData(roadmap);
    } catch (error: any) {
      setError(error.message || 'Failed to load roadmap');
      console.error('Roadmap error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadRoadmapData();
  }, [loadRoadmapData]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400';
      case 'advanced': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (course: CourseWithProgress) => {
    if (!course.isUnlocked) {
      return <Lock className="w-6 h-6 text-gray-500" />;
    }
    
    if (course.progress?.status === 'completed') {
      return <CheckCircle2 className="w-6 h-6 text-green-400" />;
    }
    
    if (course.progress?.status === 'in_progress') {
      return <PlayCircle className="w-6 h-6 text-yellow-400" />;
    }
    
    return <BookOpen className="w-6 h-6 text-blue-400" />;
  };

  const getStatusText = (course: CourseWithProgress) => {
    if (!course.isUnlocked) return 'Locked';
    if (course.progress?.status === 'completed') return 'Completed';
    if (course.progress?.status === 'in_progress') return 'In Progress';
    return 'Not Started';
  };

  const getProgressStats = () => {
    if (!roadmapData) return { completed: 0, total: 0, percentage: 0 };
    
    const total = roadmapData.length;
    const completed = roadmapData.filter((course: CourseWithProgress) => 
      course.progress?.status === 'completed'
    ).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-32 glass-card rounded-lg animate-pulse"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 glass-card rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !roadmapData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="glass-card border-0">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-400 mb-2">Failed to load roadmap</div>
              <Button onClick={loadRoadmapData} variant="outline" className="btn-secondary">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressStats = getProgressStats();

  return (
    <div className="container mx-auto px-4 py-8 relative z-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Learning Roadmap 🗺️
        </h1>
        <p className="text-gray-400">
          Follow your personalized learning path to master full-stack development
        </p>
      </div>

      {/* Overall Progress */}
      <Card className="glass-card border-0 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Map className="w-5 h-5 text-blue-400" />
            <span>Overall Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Roadmap Completion</span>
              <span className="text-white font-semibold">
                {progressStats.completed} of {progressStats.total} courses
              </span>
            </div>
            <Progress value={progressStats.percentage} className="h-3 progress-bar" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {Math.round(progressStats.percentage)}% Complete
              </span>
              <span className="text-yellow-400">
                Keep going! 🚀
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap Path */}
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          {/* Path Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-400 via-blue-400 to-purple-400 opacity-50"></div>

          <div className="space-y-8">
            {roadmapData.map((course: CourseWithProgress, index: number) => (
              <div key={course.id} className="relative">
                {/* Course Node */}
                <div className="flex items-start space-x-6">
                  {/* Status Icon */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      course.isUnlocked 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-400/20'
                        : 'bg-gray-600'
                    }`}>
                      {getStatusIcon(course)}
                    </div>
                    {course.progress?.status === 'completed' && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Course Card */}
                  <div className="flex-1">
                    <Card 
                      className={`glass-card border-0 transition-all duration-200 ${
                        course.isUnlocked 
                          ? 'hover:scale-105 cursor-pointer' 
                          : 'opacity-60'
                      }`}
                      onClick={() => course.isUnlocked && onCourseSelect(course.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className={`text-xl font-semibold ${
                                course.isUnlocked ? 'text-white' : 'text-gray-500'
                              }`}>
                                {course.title}
                              </h3>
                              <Badge 
                                variant="secondary" 
                                className={getDifficultyColor(course.difficulty_level)}
                              >
                                {course.difficulty_level}
                              </Badge>
                            </div>

                            <p className={`mb-4 ${
                              course.isUnlocked ? 'text-gray-300' : 'text-gray-500'
                            }`}>
                              {course.description}
                            </p>

                            <div className="flex items-center space-x-4 mb-4">
                              <div className="flex items-center space-x-1 text-sm text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span>{course.estimated_duration_hours}h</span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm text-yellow-400">
                                <Zap className="w-4 h-4" />
                                <span>XP rewards</span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            {course.progress && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-400">Progress</span>
                                  <span className="text-gray-400">
                                    {Math.round(course.progress.completion_percentage)}%
                                  </span>
                                </div>
                                <Progress 
                                  value={course.progress.completion_percentage} 
                                  className="h-2"
                                />
                              </div>
                            )}

                            {/* Prerequisites */}
                            {!course.isUnlocked && course.prerequisites.length > 0 && (
                              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <div className="flex items-center space-x-2 text-sm text-yellow-400">
                                  <Lock className="w-4 h-4" />
                                  <span>
                                    Complete "{course.prerequisites[0].title}" to unlock this course
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="ml-4 text-center">
                            <Badge 
                              variant={course.isUnlocked ? 'default' : 'secondary'} 
                              className={
                                course.progress?.status === 'completed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : course.progress?.status === 'in_progress'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : course.isUnlocked
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-gray-500/20 text-gray-500'
                              }
                            >
                              {getStatusText(course)}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Connection Arrow */}
                {index < roadmapData.length - 1 && (
                  <div className="flex justify-center mt-6">
                    <ArrowDown className="w-6 h-6 text-gray-400 opacity-50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completion Message */}
      {progressStats.percentage === 100 && (
        <Card className="glass-card border-0 mt-8">
          <CardContent className="text-center p-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Congratulations!
            </h2>
            <p className="text-gray-400">
              You've completed the entire learning roadmap! You're now a full-stack development expert.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}