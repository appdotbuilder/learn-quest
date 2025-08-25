import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Zap, 
  Target, 
  TrendingUp,
  Award,
  Star,
  Calendar,
  BookOpen,
  CheckCircle2,
  BarChart3,
  Flame
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, UserProfileStats, UserAchievement } from '../../../server/src/schema';

interface ProfileProps {
  user: User;
}

export function Profile({ user }: ProfileProps) {
  const [profileStats, setProfileStats] = useState<UserProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfileStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const stats = await trpc.getUserProfileStats.query({ userId: user.id });
      setProfileStats(stats);
    } catch (error: any) {
      setError(error.message || 'Failed to load profile stats');
      console.error('Profile stats error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadProfileStats();
  }, [loadProfileStats]);

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const calculateLevelProgress = (xp: number, level: number) => {
    const baseXP = 100;
    const currentLevelXP = baseXP * Math.pow(1.5, level - 1);
    const nextLevelXP = baseXP * Math.pow(1.5, level);
    const progressXP = xp - (level > 1 ? currentLevelXP : 0);
    const requiredXP = nextLevelXP - (level > 1 ? currentLevelXP : 0);
    return Math.min((progressXP / requiredXP) * 100, 100);
  };

  const getAchievementIcon = (category: string) => {
    switch (category) {
      case 'milestone': return <Target className="w-4 h-4" />;
      case 'quiz_master': return <Trophy className="w-4 h-4" />;
      case 'streak': return <Flame className="w-4 h-4" />;
      case 'course_completion': return <BookOpen className="w-4 h-4" />;
      case 'special': return <Star className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

  const getAchievementColor = (category: string) => {
    switch (category) {
      case 'milestone': return 'from-green-500 to-emerald-500';
      case 'quiz_master': return 'from-yellow-500 to-orange-500';
      case 'streak': return 'from-red-500 to-pink-500';
      case 'course_completion': return 'from-blue-500 to-cyan-500';
      case 'special': return 'from-purple-500 to-violet-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 glass-card rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !profileStats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="glass-card border-0">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-400 mb-2">Failed to load profile</div>
              <button 
                onClick={loadProfileStats} 
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { statistics, achievements, progressHistory } = profileStats;
  const levelProgress = calculateLevelProgress(user.total_xp, user.current_level);

  return (
    <div className="container mx-auto px-4 py-8 relative z-10">
      {/* Profile Header */}
      <Card className="glass-card border-0 mb-6">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-32 h-32 ring-4 ring-yellow-400/20">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.username} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 text-4xl font-bold">
                    {getInitials(user.username)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                Level {user.current_level}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold text-white mb-2">{user.username}</h1>
              <p className="text-gray-400 mb-4">{user.email}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
                <div className="glass-card-light px-4 py-2 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-400">{user.total_xp.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Total XP</div>
                </div>
                <div className="glass-card-light px-4 py-2 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{statistics.coursesCompleted}</div>
                  <div className="text-xs text-gray-400">Courses</div>
                </div>
                <div className="glass-card-light px-4 py-2 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-400">{achievements.length}</div>
                  <div className="text-xs text-gray-400">Achievements</div>
                </div>
              </div>

              {/* Level Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Progress to Level {user.current_level + 1}</span>
                  <span className="text-gray-400">{Math.round(levelProgress)}%</span>
                </div>
                <Progress value={levelProgress} className="h-3 progress-bar" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Learning Statistics */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span>Learning Statistics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 glass-card-light rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">Lessons Completed</span>
                    </div>
                    <span className="text-xl font-bold text-green-400">
                      {statistics.totalLessonsCompleted}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 glass-card-light rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                      <span className="text-gray-300">Quizzes Taken</span>
                    </div>
                    <span className="text-xl font-bold text-yellow-400">
                      {statistics.totalQuizzesTaken}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 glass-card-light rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Flame className="w-5 h-5 text-red-400" />
                      <span className="text-gray-300">Current Streak</span>
                    </div>
                    <span className="text-xl font-bold text-red-400">
                      {statistics.currentStreak} days
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 glass-card-light rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Star className="w-5 h-5 text-purple-400" />
                      <span className="text-gray-300">Average Score</span>
                    </div>
                    <span className="text-xl font-bold text-purple-400">
                      {Math.round(statistics.averageQuizScore * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 glass-card-light rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Target className="w-5 h-5 text-orange-400" />
                      <span className="text-gray-300">Longest Streak</span>
                    </div>
                    <span className="text-xl font-bold text-orange-400">
                      {statistics.longestStreak} days
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 glass-card-light rounded-lg">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="w-5 h-5 text-cyan-400" />
                      <span className="text-gray-300">Courses Done</span>
                    </div>
                    <span className="text-xl font-bold text-cyan-400">
                      {statistics.coursesCompleted}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress History Chart */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span>Learning Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progressHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400">Start learning to see your progress history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400 mb-4">Recent activity:</p>
                  {progressHistory.slice(0, 10).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 glass-card-light rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {entry.date.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1 text-yellow-400">
                          <Zap className="w-3 h-3" />
                          <span className="text-sm">+{entry.xpGained} XP</span>
                        </div>
                        <div className="flex items-center space-x-1 text-blue-400">
                          <BookOpen className="w-3 h-3" />
                          <span className="text-sm">{entry.lessonsCompleted} lessons</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Achievements */}
        <div>
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span>Achievements</span>
                <Badge variant="secondary" className="ml-auto">
                  {achievements.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400 mb-2">No achievements yet</p>
                  <p className="text-sm text-gray-500">
                    Complete lessons and quizzes to unlock achievements!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {achievements.map((achievement: UserAchievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center space-x-3 p-3 glass-card-light rounded-lg achievement-glow"
                    >
                      <div className={`w-10 h-10 bg-gradient-to-r ${getAchievementColor('special')} rounded-full flex items-center justify-center text-white`}>
                        {getAchievementIcon('special')}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white text-sm">
                          Achievement Unlocked!
                        </h3>
                        <p className="text-xs text-gray-400">
                          Earned {achievement.earned_at.toLocaleDateString()}
                        </p>
                      </div>
                      <Star className="w-4 h-4 text-yellow-400" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}