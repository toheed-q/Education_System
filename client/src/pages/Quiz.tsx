import { Navigation } from "@/components/Navigation";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, Award, Clock, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface Question {
  id: number;
  questionText: string;
  options: string[];
}

interface QuizData {
  id: number;
  title: string;
  passScorePercent: number;
  isFinalExam: boolean;
  weekId: number;
  courseSlug: string;
  courseId: number;
  questions: Question[];
}

interface QuizResult {
  scorePercent: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
}

export default function Quiz() {
  const [, params] = useRoute("/quiz/:id");
  const quizId = parseInt(params?.id || "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  
  const { data: quiz, isLoading, error } = useQuery<QuizData>({
    queryKey: ["/api/quizzes", quizId],
    queryFn: async () => {
      const res = await fetch(`/api/quizzes/${quizId}`);
      if (!res.ok) throw new Error("Failed to fetch quiz");
      return res.json();
    },
    enabled: !!quizId,
  });
  
  const submitMutation = useMutation({
    mutationFn: async (answers: Record<number, number>) => {
      const response = await apiRequest("POST", `/api/quizzes/${quizId}/submit`, { answers });
      return response.json();
    },
    onSuccess: (data: QuizResult) => {
      setResult(data);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      if (quiz?.courseSlug) {
        queryClient.invalidateQueries({ queryKey: ["/api/courses/slug", quiz.courseSlug] });
      }
      if (quiz?.courseId) {
        queryClient.invalidateQueries({ queryKey: ["/api/courses", quiz.courseId, "progress"] });
      }
    },
  });

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = () => {
    if (!quiz || !user) return;
    submitMutation.mutate(answers);
  };

  const allAnswered = quiz?.questions.every(q => answers[q.id] !== undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-slate-400">Loading quiz...</div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <p className="text-slate-500">Quiz not found or you don't have access.</p>
          <Link href="/courses">
            <Button variant="outline">Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="bg-white border-b border-slate-100 pt-20 pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href={quiz?.courseSlug ? `/courses/${quiz.courseSlug}` : "/courses"}>
            <button className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Course
            </button>
          </Link>
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {quiz.isFinalExam && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                Final Exam
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-500 text-sm">
              <Award className="w-4 h-4" />
              Pass: {quiz.passScorePercent}%
            </span>
          </div>
          
          <h1 className="text-3xl font-display font-bold text-slate-900" data-testid="text-quiz-title">
            {quiz.title}
          </h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {submitted && result ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center"
          >
            {result.passed ? (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-700 mb-2" data-testid="text-result-title">
                  Congratulations! You Passed!
                </h2>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-700 mb-2" data-testid="text-result-title">
                  Keep Practicing!
                </h2>
              </>
            )}
            
            <p className="text-4xl font-bold text-slate-900 mb-2" data-testid="text-score">
              {result.scorePercent}%
            </p>
            <p className="text-slate-500 mb-6">
              {result.correctAnswers} of {result.totalQuestions} questions correct
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!result.passed && (
                <Button 
                  onClick={() => {
                    setSubmitted(false);
                    setResult(null);
                    setAnswers({});
                  }}
                  variant="outline"
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
              )}
              <Link href={quiz.courseSlug ? `/courses/${quiz.courseSlug}` : "/courses"}>
                <Button data-testid="button-continue">Continue Learning</Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {quiz.questions.map((question, qIndex) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: qIndex * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
                data-testid={`question-${question.id}`}
              >
                <p className="text-sm text-slate-400 mb-2">Question {qIndex + 1}</p>
                <p className="text-lg font-medium text-slate-900 mb-4">{question.questionText}</p>
                
                <div className="space-y-3">
                  {question.options.map((option, optIndex) => (
                    <button
                      key={optIndex}
                      onClick={() => handleSelectAnswer(question.id, optIndex)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border transition-all",
                        answers[question.id] === optIndex
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      )}
                      data-testid={`button-option-${question.id}-${optIndex}`}
                    >
                      <span className="font-medium mr-3">
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky bottom-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-slate-500">
                  {Object.keys(answers).length} of {quiz.questions.length} answered
                </p>
                <Button
                  size="lg"
                  disabled={!allAnswered || submitMutation.isPending || !user}
                  onClick={handleSubmit}
                  data-testid="button-submit-quiz"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Quiz"}
                </Button>
              </div>
              {!user && (
                <p className="text-sm text-amber-600 mt-2 text-center sm:text-left">
                  Please <Link href="/login" className="underline">log in</Link> to submit your quiz.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
