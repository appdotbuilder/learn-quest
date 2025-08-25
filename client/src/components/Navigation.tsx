import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Home, 
  Map, 
  User as UserIcon, 
  LogOut, 
  Trophy,
  Zap
} from 'lucide-react';
import type { User } from '../../../server/src/schema';

type Page = 'auth' | 'dashboard' | 'courses' | 'course-detail' | 'lesson' | 'profile' | 'roadmap';

interface NavigationProps {
  user: User;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function Navigation({ user, currentPage, onNavigate, onLogout }: NavigationProps) {
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: Home },
    { id: 'courses' as Page, label: 'Courses', icon: BookOpen },
    { id: 'roadmap' as Page, label: 'Roadmap', icon: Map },
    { id: 'profile' as Page, label: 'Profile', icon: UserIcon },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 nav-glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-gray-900" />
            </div>
            <span className="text-xl font-bold gradient-text">CodeQuest</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center space-x-2 ${
                    currentPage === item.id 
                      ? 'btn-primary' 
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-4">
            {/* XP and Level */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="flex items-center space-x-1 glass-card-light px-3 py-1 rounded-full">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium">{user.total_xp} XP</span>
              </div>
              <Badge 
                variant="secondary" 
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white"
              >
                <Trophy className="w-3 h-3 mr-1" />
                Level {user.current_level}
              </Badge>
            </div>

            {/* User Avatar */}
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.username} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 text-sm font-semibold">
                    {getInitials(user.username)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="hidden md:block text-sm font-medium">
                {user.username}
              </span>
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-2">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(item.id)}
                  className={`flex flex-col items-center space-y-1 h-auto py-2 ${
                    currentPage === item.id 
                      ? 'text-yellow-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}