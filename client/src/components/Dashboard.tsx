import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Zap, 
  BookOpen, 
  Target, 
  TrendingUp, 
  PlayCircle,
  Star,
  Award,
  ChevronRight
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, DashboardData } from '../../../server/src/schema';

type Page = 'auth' | 'dashboard' | 'courses' | 'course-detail' | 'lesson' | 'profile' | 'roadmap';

interface DashboardProps {
  user: User;
  onNavigate: (page: Page, courseId?: number, lessonId?: number) => void;
}

export function Dashboard({ user, onNavigate }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getDashboardData.query({ userId: user.id });
      setDashboardData(data);
    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data');
      console.error('Dashboard data error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const calculateLevelProgress = (xp: number, level: number) => {
    const baseXP = 100;
    const currentLevelXP = baseXP * Math.pow(1.5, level - 1);
    const nextLevelXP = baseXP * Math.pow(1.5, level);
    const progressXP = xp - (level > 1 ? currentLevelXP : 0);
    const requiredXP = nextLevelXP - (level > 1 ? currentLevelXP : 0);
    return (progressXP / requiredXP) * 100;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 glass-card rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="glass-card border-0">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-400 mb-2">Failed to load dashboard</div>
              <Button 
                onClick={loadDashboardData} 
                variant="outline" 
                className="btn-secondary"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overallProgress, recentAchievements, recommendedLessons } = dashboardData;
  const levelProgress = calculateLevelProgress(user.total_xp, user.current_level);
  const completionRate = overallProgress.totalCourses > 0 
    ? (overallProgress.completedCourses / overallProgress.totalCourses) * 100 
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 relative z-10">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, <span className="gradient-text">{user.username}</span>! 🚀
        </h1>
        <p className="text-gray-400">
          Ready to continue your coding journey?
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Overview */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <span>Your Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Level Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Level {user.current_level}</span>
                  <span className="text-sm text-gray-400">
                    {user.total_xp} XP
                  </span>
                </div>
                <Progress value={levelProgress} className="h-3 progress-bar" />
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(levelProgress)}% to Level {user.current_level + 1}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 glass-card-light rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {overallProgress.completedCourses}
                  </div>
                  <div className="text-xs text-gray-400">Completed</div>
                </div>
                <div className="text-center p-4 glass-card-light rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {overallProgress.inProgressCourses}
                  </div>
                  <div className="text-xs text-gray-400">In Progress</div>
                </div>
                <div className="text-center p-4 glass-card-light rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">
                    {Math.round(completionRate)}%
                  </div>
                  <div className="text-xs text-gray-400">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Lessons */}
          <Card className="glass-card border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-white">
                <Target className="w-5 h-5 text-green-400" />
                <span>Continue Learning</span>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate('courses')}
                className="text-yellow-400 hover:text-yellow-300"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recommendedLessons.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No lessons available yet</p>
                  <Button 
                    onClick={() => onNavigate('courses')}
                    className="btn-primary"
                  >
                    Browse Courses
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendedLessons.slice(0, 3).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-4 glass-card-light rounded-lg hover:bg-opacity-60 transition-all cursor-pointer group"
                      onClick={() => onNavigate('lesson', lesson.course_id, lesson.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <PlayCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white group-hover:text-yellow-400 transition-colors">
                            {lesson.title}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {lesson.programming_language || 'General'}
                            </Badge>
                            <span className="text-xs text-gray-400 flex items-center">
                              <Zap className="w-3 h-3 mr-1" />
                              {lesson.xp_reward} XP
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-yellow-400 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* XP Card */}
          <Card className="glass-card border-0 xp-glow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span>Experience Points</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">
                {user.total_xp.toLocaleString()}
              </div>
              <div className="text-gray-400">Total XP Earned</div>
              <Button 
                onClick={() => onNavigate('profile')}
                className="w-full mt-4 btn-secondary"
              >
                View Progress
              </Button>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card className="glass-card border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-white">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span>Recent Achievements</span>
              </CardTitle>
              {recentAchievements.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onNavigate('profile')}
                  className="text-yellow-400 hover:text-yellow-300"
                >
                  View All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentAchievements.length === 0 ? (
                <div className="text-center py-4">
                  <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    Complete lessons to unlock achievements!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAchievements.slice(0, 3).map((achievement) => (
                    <div 
                      key={achievement.id}
                      className="flex items-center space-x-3 p-3 glass-card-light rounded-lg achievement-glow"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 text-gray-900" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          New Achievement!
                        </div>
                        <div className="text-xs text-gray-400">
                          {achievement.earned_at.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => onNavigate('roadmap')}
                className="w-full justify-start btn-secondary"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                View Course Roadmap
              </Button>
              <Button 
                onClick={() => onNavigate('courses')}
                className="w-full justify-start btn-secondary"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Browse All Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}