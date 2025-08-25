import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Mail, User as UserIcon, Lock, Sparkles } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, LoginInput, RegisterInput } from '../../../server/src/schema';

interface AuthFormProps {
  onLogin: (user: User) => void;
}

export function AuthForm({ onLogin }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loginData, setLoginData] = useState<LoginInput>({
    email: '',
    password: '',
  });

  const [registerData, setRegisterData] = useState<RegisterInput>({
    email: '',
    username: '',
    password: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await trpc.login.mutate(loginData);
      onLogin(result);
    } catch (error: any) {
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await trpc.register.mutate(registerData);
      onLogin(result);
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-gray-900" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">CodeQuest</h1>
          <p className="text-gray-400 text-lg">
            Level up your coding skills with gamified learning
          </p>
          <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Earn XP</span>
            </div>
            <div className="flex items-center space-x-1">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Interactive Lessons</span>
            </div>
            <div className="flex items-center space-x-1">
              <UserIcon className="w-4 h-4 text-purple-400" />
              <span>Track Progress</span>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="glass-card border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-white">Get Started</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-transparent">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-gray-900 text-gray-400"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-gray-900 text-gray-400"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert className="mb-4 border-red-500/20 bg-red-500/10">
                  <AlertDescription className="text-red-300">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      className="pl-10 glass-card-light border-0 text-white placeholder:text-gray-400"
                      value={loginData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Password"
                      className="pl-10 glass-card-light border-0 text-white placeholder:text-gray-400"
                      value={loginData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary h-11"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      className="pl-10 glass-card-light border-0 text-white placeholder:text-gray-400"
                      value={registerData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Username"
                      className="pl-10 glass-card-light border-0 text-white placeholder:text-gray-400"
                      value={registerData.username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterInput) => ({ ...prev, username: e.target.value }))
                      }
                      required
                      minLength={3}
                      maxLength={50}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Password"
                      className="pl-10 glass-card-light border-0 text-white placeholder:text-gray-400"
                      value={registerData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                      minLength={6}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary h-11"
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Join thousands of developers mastering full-stack development
        </p>
      </div>
    </div>
  );
}