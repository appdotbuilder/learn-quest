import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  ArrowRight,
  Code, 
  BookOpen, 
  CheckCircle2, 
  Zap,
  Trophy,
  Play,
  RotateCcw,
  Lightbulb,
  Target
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Lesson, 
  QuizQuestion, 
  SubmitQuizInput 
} from '../../../server/src/schema';

interface LessonViewProps {
  lessonId: number;
  courseId: number;
  user: User;
  onBack: () => void;
  onNextLesson: (lessonId: number) => void;
}

type QuizState = 'not-started' | 'in-progress' | 'completed';

export function LessonView({ lessonId, courseId, user, onBack, onNextLesson }: LessonViewProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Code editor state
  const [code, setCode] = useState<string>('');
  
  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>('not-started');
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [lessonData, questionsData] = await Promise.all([
        trpc.getLessonById.query({ lessonId }),
        trpc.getQuizQuestions.query({ lessonId })
      ]);
      
      setLesson(lessonData);
      setQuizQuestions(questionsData);
      
      // Initialize code editor with template
      if (lessonData?.code_template) {
        setCode(lessonData.code_template);
      } else {
        setCode(getDefaultCode(lessonData?.programming_language || null));
      }
      
      // Initialize quiz answers array
      setSelectedAnswers(new Array(questionsData.length).fill(-1));
    } catch (error: any) {
      setError(error.message || 'Failed to load lesson');
      console.error('Lesson data error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDefaultCode = (language: string | null | undefined): string => {
    switch (language?.toLowerCase()) {
      case 'javascript':
        return '// Welcome to JavaScript!\nconsole.log("Hello, World!");';
      case 'python':
        return '# Welcome to Python!\nprint("Hello, World!")';
      case 'java':
        return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}';
      case 'html':
        return '<!DOCTYPE html>\n<html>\n<head>\n    <title>My Page</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>';
      case 'css':
        return '/* Welcome to CSS! */\nbody {\n    background-color: #f0f0f0;\n    font-family: Arial, sans-serif;\n}';
      default:
        return '// Start coding here...\n';
    }
  };

  const resetCode = () => {
    if (lesson?.code_template) {
      setCode(lesson.code_template);
    } else {
      setCode(getDefaultCode(lesson?.programming_language));
    }
  };

  const startQuiz = () => {
    setQuizState('in-progress');
    setSelectedAnswers(new Array(quizQuestions.length).fill(-1));
    setQuizScore(null);
    setShowExplanations(false);
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setSelectedAnswers((prev: number[]) => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  };

  const submitQuiz = async () => {
    if (selectedAnswers.includes(-1)) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setIsSubmittingQuiz(true);
    try {
      const quizData: SubmitQuizInput = {
        lesson_id: lessonId,
        answers: selectedAnswers
      };

      const result = await trpc.submitQuiz.mutate({
        userId: user.id,
        ...quizData
      });

      setQuizScore(result.score);
      setQuizState('completed');
      setShowExplanations(true);

      // Update user progress
      await trpc.updateProgress.mutate({
        userId: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: lesson?.xp_reward || 0
      });

    } catch (error: any) {
      console.error('Quiz submission error:', error);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const getLanguageColor = (language: string | null) => {
    switch (language?.toLowerCase()) {
      case 'javascript': return 'bg-yellow-500/20 text-yellow-400';
      case 'python': return 'bg-blue-500/20 text-blue-400';
      case 'java': return 'bg-red-500/20 text-red-400';
      case 'html': return 'bg-orange-500/20 text-orange-400';
      case 'css': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-96 glass-card rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="glass-card border-0">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-400 mb-2">Failed to load lesson</div>
              <Button onClick={loadData} variant="outline" className="btn-secondary">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          onClick={onBack}
          variant="ghost" 
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Course
        </Button>
        
        <div className="flex items-center space-x-4">
          {lesson.programming_language && (
            <Badge 
              variant="secondary" 
              className={getLanguageColor(lesson.programming_language)}
            >
              {lesson.programming_language}
            </Badge>
          )}
          <div className="flex items-center space-x-1 text-yellow-400">
            <Zap className="w-4 h-4" />
            <span>{lesson.xp_reward} XP</span>
          </div>
        </div>
      </div>

      {/* Lesson Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">{lesson.title}</h1>
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-green-400" />
          <span className="text-gray-400">Complete the lesson and pass the quiz to earn XP</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Panel - Lesson Content & Code */}
        <div className="space-y-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-transparent">
              <TabsTrigger 
                value="content" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-gray-900 text-gray-400"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Lesson
              </TabsTrigger>
              <TabsTrigger 
                value="code"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-gray-900 text-gray-400"
              >
                <Code className="w-4 h-4 mr-2" />
                Code Editor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <span>Lesson Content</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none">
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {lesson.content}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="code" className="mt-6">
              <Card className="glass-card border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Code className="w-5 h-5 text-blue-400" />
                    <span>Interactive Code Editor</span>
                  </CardTitle>
                  <div className="space-x-2">
                    <Button
                      onClick={resetCode}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="code-editor">
                    <Textarea
                      value={code}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCode(e.target.value)}
                      className="min-h-[400px] font-mono text-sm bg-transparent border-0 text-green-400 placeholder:text-gray-600 resize-none focus:ring-0"
                      placeholder="Write your code here..."
                    />
                  </div>
                  
                  <Alert className="mt-4 border-blue-500/20 bg-blue-500/10">
                    <Lightbulb className="w-4 h-4 text-blue-400" />
                    <AlertDescription className="text-blue-300">
                      This is a practice environment. Write and experiment with your code here!
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Quiz */}
        <div>
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Trophy className="w-5 h-5 text-purple-400" />
                <span>Knowledge Check</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quizQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No quiz for this lesson</p>
                  <Button className="btn-primary">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {quizState === 'not-started' && (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Ready for the quiz?
                      </h3>
                      <p className="text-gray-400 mb-6">
                        Test your knowledge with {quizQuestions.length} questions
                      </p>
                      <Button onClick={startQuiz} className="btn-achievement">
                        <Play className="w-4 h-4 mr-2" />
                        Start Quiz
                      </Button>
                    </div>
                  )}

                  {quizState === 'in-progress' && (
                    <div className="space-y-6">
                      {quizQuestions.map((question: QuizQuestion, qIndex: number) => (
                        <div key={question.id} className="space-y-3">
                          <h3 className="font-medium text-white">
                            {qIndex + 1}. {question.question_text}
                          </h3>
                          <div className="space-y-2">
                            {question.options.map((option: string, oIndex: number) => (
                              <label
                                key={oIndex}
                                className={`flex items-center p-3 glass-card-light rounded-lg cursor-pointer hover:bg-opacity-60 transition-all ${
                                  selectedAnswers[qIndex] === oIndex ? 'ring-2 ring-yellow-400' : ''
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${qIndex}`}
                                  value={oIndex}
                                  checked={selectedAnswers[qIndex] === oIndex}
                                  onChange={() => handleAnswerSelect(qIndex, oIndex)}
                                  className="sr-only"
                                />
                                <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                                  selectedAnswers[qIndex] === oIndex 
                                    ? 'border-yellow-400 bg-yellow-400' 
                                    : 'border-gray-400'
                                }`}>
                                  {selectedAnswers[qIndex] === oIndex && (
                                    <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                                  )}
                                </div>
                                <span className="text-gray-300">{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <Button
                        onClick={submitQuiz}
                        disabled={selectedAnswers.includes(-1) || isSubmittingQuiz}
                        className="w-full btn-achievement"
                      >
                        {isSubmittingQuiz ? 'Submitting...' : 'Submit Quiz'}
                      </Button>
                    </div>
                  )}

                  {quizState === 'completed' && quizScore !== null && (
                    <div className="space-y-6">
                      {/* Quiz Results */}
                      <div className="text-center py-6 glass-card-light rounded-lg">
                        <div className={`text-4xl font-bold mb-2 ${
                          quizScore >= 0.8 ? 'text-green-400' : quizScore >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {Math.round(quizScore * 100)}%
                        </div>
                        <p className="text-gray-400 mb-4">
                          {quizScore >= 0.8 
                            ? 'Excellent work! 🎉' 
                            : quizScore >= 0.6 
                            ? 'Good job! Keep practicing.' 
                            : 'Keep studying and try again!'
                          }
                        </p>
                        {quizScore >= 0.6 && (
                          <div className="flex items-center justify-center space-x-2 text-yellow-400">
                            <Zap className="w-4 h-4" />
                            <span>+{lesson.xp_reward} XP earned!</span>
                          </div>
                        )}
                      </div>

                      {/* Quiz Review */}
                      {showExplanations && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-white">Review:</h3>
                          {quizQuestions.map((question: QuizQuestion, qIndex: number) => (
                            <div key={question.id} className="space-y-2">
                              <h4 className="font-medium text-white">
                                {qIndex + 1}. {question.question_text}
                              </h4>
                              <div className="space-y-1">
                                {question.options.map((option: string, oIndex: number) => (
                                  <div
                                    key={oIndex}
                                    className={`p-2 rounded text-sm ${
                                      oIndex === question.correct_answer_index
                                        ? 'bg-green-500/20 text-green-400'
                                        : oIndex === selectedAnswers[qIndex] && oIndex !== question.correct_answer_index
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'text-gray-400'
                                    }`}
                                  >
                                    {option}
                                    {oIndex === question.correct_answer_index && ' ✓'}
                                    {oIndex === selectedAnswers[qIndex] && oIndex !== question.correct_answer_index && ' ✗'}
                                  </div>
                                ))}
                              </div>
                              {question.explanation && (
                                <p className="text-xs text-gray-400 italic">
                                  {question.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <Button 
                        className="w-full btn-primary"
                        onClick={() => {
                          // TODO: Navigate to next lesson
                          alert('Great job! Feature to navigate to next lesson will be implemented.');
                        }}
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Continue to Next Lesson
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}