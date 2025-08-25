import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { AuthForm } from '@/components/AuthForm';
import { Dashboard } from '@/components/Dashboard';
import { CourseList } from '@/components/CourseList';
import { CourseDetail } from '@/components/CourseDetail';
import { LessonView } from '@/components/LessonView';
import { Profile } from '@/components/Profile';
import { CourseRoadmap } from '@/components/CourseRoadmap';
import { trpc } from '@/utils/trpc';
import type { User } from '../../server/src/schema';
import './App.css';

type Page = 'auth' | 'dashboard' | 'courses' | 'course-detail' | 'lesson' | 'profile' | 'roadmap';

interface AppState {
  currentPage: Page;
  user: User | null;
  selectedCourseId: number | null;
  selectedLessonId: number | null;
  isLoading: boolean;
}

function App() {
  const [state, setState] = useState<AppState>({
    currentPage: 'auth',
    user: null,
    selectedCourseId: null,
    selectedLessonId: null,
    isLoading: false,
  });

  // Check for existing user session on load
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData) as User;
        setState(prev => ({ ...prev, user, currentPage: 'dashboard' }));
      } catch (error) {
        console.error('Invalid user data in localStorage:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    setState(prev => ({ ...prev, user, currentPage: 'dashboard' }));
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setState(prev => ({ 
      ...prev, 
      user: null, 
      currentPage: 'auth',
      selectedCourseId: null,
      selectedLessonId: null 
    }));
  };

  const navigateTo = (page: Page, courseId?: number, lessonId?: number) => {
    setState(prev => ({ 
      ...prev, 
      currentPage: page,
      selectedCourseId: courseId ?? null,
      selectedLessonId: lessonId ?? null
    }));
  };

  const renderCurrentPage = () => {
    if (!state.user && state.currentPage !== 'auth') {
      return <AuthForm onLogin={handleLogin} />;
    }

    switch (state.currentPage) {
      case 'auth':
        return <AuthForm onLogin={handleLogin} />;
      case 'dashboard':
        return (
          <Dashboard
            user={state.user!}
            onNavigate={navigateTo}
          />
        );
      case 'courses':
        return (
          <CourseList
            user={state.user!}
            onCourseSelect={(courseId: number) => navigateTo('course-detail', courseId)}
          />
        );
      case 'course-detail':
        return (
          <CourseDetail
            courseId={state.selectedCourseId!}
            user={state.user!}
            onLessonSelect={(lessonId: number) => navigateTo('lesson', state.selectedCourseId!, lessonId)}
            onBack={() => navigateTo('courses')}
          />
        );
      case 'lesson':
        return (
          <LessonView
            lessonId={state.selectedLessonId!}
            courseId={state.selectedCourseId!}
            user={state.user!}
            onBack={() => navigateTo('course-detail', state.selectedCourseId!)}
            onNextLesson={(nextLessonId: number) => navigateTo('lesson', state.selectedCourseId!, nextLessonId)}
          />
        );
      case 'profile':
        return (
          <Profile
            user={state.user!}
          />
        );
      case 'roadmap':
        return (
          <CourseRoadmap
            user={state.user!}
            onCourseSelect={(courseId: number) => navigateTo('course-detail', courseId)}
          />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen">
      {state.user && (
        <Navigation
          user={state.user}
          currentPage={state.currentPage}
          onNavigate={navigateTo}
          onLogout={handleLogout}
        />
      )}
      
      <main className={state.user ? "pt-16" : ""}>
        {renderCurrentPage()}
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-50">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}

export default App;