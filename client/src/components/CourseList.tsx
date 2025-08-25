import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Clock, 
  Star, 
  PlayCircle,
  CheckCircle2,
  Lock,
  Filter
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Course, UserProgress } from '../../../server/src/schema';

interface CourseListProps {
  user: User;
  onCourseSelect: (courseId: number) => void;
}

interface CourseWithProgress extends Course {
  progress?: UserProgress;
  isLocked?: boolean;
}

export function CourseList({ user, onCourseSelect }: CourseListProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [coursesData, progressData] = await Promise.all([
        trpc.getCourses.query(),
        trpc.getUserProgress.query({ userId: user.id })
      ]);
      
      setCourses(coursesData);
      setUserProgress(progressData);
    } catch (error: any) {
      setError(error.message || 'Failed to load courses');
      console.error('Courses data error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCoursesWithProgress = (): CourseWithProgress[] => {
    return courses.map((course: Course) => {
      const progress = userProgress.find((p: UserProgress) => p.course_id === course.id);
      return {
        ...course,
        progress,
        isLocked: false // TODO: Implement prerequisite checking
      };
    });
  };

  const getFilteredCourses = () => {
    const coursesWithProgress = getCoursesWithProgress();
    
    switch (filter) {
      case 'completed':
        return coursesWithProgress.filter((course: CourseWithProgress) => 
          course.progress?.status === 'completed'
        );
      case 'in-progress':
        return coursesWithProgress.filter((course: CourseWithProgress) => 
          course.progress?.status === 'in_progress'
        );
      case 'not-started':
        return coursesWithProgress.filter((course: CourseWithProgress) => 
          !course.progress || course.progress.status === 'not_started'
        );
      case 'beginner':
      case 'intermediate':
      case 'advanced':
        return coursesWithProgress.filter((course: CourseWithProgress) => 
          course.difficulty_level === filter
        );
      default:
        return coursesWithProgress;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400';
      case 'advanced': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (course: CourseWithProgress) => {
    if (course.isLocked) {
      return <Lock className="w-5 h-5 text-gray-500" />;
    }
    
    if (course.progress?.status === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    }
    
    if (course.progress?.status === 'in_progress') {
      return <PlayCircle className="w-5 h-5 text-yellow-400" />;
    }
    
    return <BookOpen className="w-5 h-5 text-blue-400" />;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 glass-card rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="glass-card border-0">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-400 mb-2">Failed to load courses</div>
              <Button onClick={loadData} variant="outline" className="btn-secondary">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredCourses = getFilteredCourses();

  return (
    <div className="container mx-auto px-4 py-8 relative z-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Course Library 📚
        </h1>
        <p className="text-gray-400">
          Choose your learning path and start building awesome projects
        </p>
      </div>

      {/* Filters */}
      <Card className="glass-card border-0 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filter courses:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All Courses' },
              { value: 'not-started', label: 'Not Started' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
            ].map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(option.value)}
                className={filter === option.value ? 'btn-primary' : 'btn-secondary'}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="glass-card border-0">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No courses found for the selected filter</p>
              <Button 
                onClick={() => setFilter('all')}
                className="btn-primary"
              >
                Show All Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course: CourseWithProgress) => (
            <Card 
              key={course.id} 
              className={`glass-card border-0 hover:scale-105 transition-all duration-200 cursor-pointer group ${
                course.isLocked ? 'opacity-60' : ''
              }`}
              onClick={() => !course.isLocked && onCourseSelect(course.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white group-hover:text-yellow-400 transition-colors text-lg">
                      {course.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getDifficultyColor(course.difficulty_level)}`}
                      >
                        {course.difficulty_level}
                      </Badge>
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{course.estimated_duration_hours}h</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-2">
                    {getStatusIcon(course)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                  {course.description}
                </p>
                
                {/* Progress Bar */}
                {course.progress && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-gray-400">
                        {Math.round(course.progress.completion_percentage)}%
                      </span>
                    </div>
                    <Progress 
                      value={course.progress.completion_percentage} 
                      className="h-2 progress-bar"
                    />
                  </div>
                )}

                {/* XP Earned */}
                {course.progress && course.progress.xp_earned > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-yellow-400 mb-3">
                    <Star className="w-3 h-3" />
                    <span>{course.progress.xp_earned} XP earned</span>
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  className={`w-full ${
                    course.isLocked 
                      ? 'btn-secondary opacity-50 cursor-not-allowed' 
                      : course.progress?.status === 'completed'
                      ? 'btn-achievement'
                      : 'btn-primary'
                  }`}
                  disabled={course.isLocked}
                >
                  {course.isLocked ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Locked
                    </>
                  ) : course.progress?.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Review Course
                    </>
                  ) : course.progress?.status === 'in_progress' ? (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Continue
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Start Course
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}