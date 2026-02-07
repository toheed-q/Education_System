import { Navigation } from "@/components/Navigation";
import { useCourseBySlug, useCourseProgress } from "@/hooks/use-content";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, CheckCircle, Lock, PlayCircle, FileText, Video, LinkIcon, ChevronDown, ChevronUp, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { saveIntent, getIntent, clearIntent } from "@/lib/intent";

interface ContentItem {
  id: number;
  title: string;
  type: "video" | "reading" | "file" | "link";
  contentUrl?: string;
  contentText?: string;
  sequenceOrder: number;
}

interface Quiz {
  id: number;
  title: string;
  passScorePercent: number;
  isFinalExam: boolean;
}

interface Week {
  id: number;
  weekNumber: number;
  title: string;
  content?: ContentItem[];
  quiz?: Quiz;
}

function getContentIcon(type: string) {
  switch(type) {
    case "video": return <Video className="w-4 h-4" />;
    case "reading": return <FileText className="w-4 h-4" />;
    case "file": return <FileText className="w-4 h-4" />;
    case "link": return <LinkIcon className="w-4 h-4" />;
    default: return <BookOpen className="w-4 h-4" />;
  }
}

function ContentPlayer({ content }: { content: ContentItem }) {
  if (content.type === "reading" && content.contentText) {
    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-4">{content.title}</h4>
        <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-wrap">
          {content.contentText}
        </div>
      </div>
    );
  }
  
  if (content.type === "video" && content.contentUrl) {
    const isYoutube = content.contentUrl.includes("youtube.com") || content.contentUrl.includes("youtu.be");
    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-4">{content.title}</h4>
        {isYoutube ? (
          <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center">
            <div className="text-center text-white">
              <PlayCircle className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-75">Video content placeholder</p>
              <a href={content.contentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                Watch on YouTube
              </a>
            </div>
          </div>
        ) : (
          <a href={content.contentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Open Video
          </a>
        )}
      </div>
    );
  }
  
  if ((content.type === "file" || content.type === "link") && content.contentUrl) {
    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-4">{content.title}</h4>
        <a 
          href={content.contentUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:underline"
          data-testid={`link-content-${content.id}`}
        >
          {content.type === "file" ? <FileText className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
          Download / Open
        </a>
      </div>
    );
  }
  
  return null;
}

function WeekAccordion({ 
  week, 
  index, 
  isExpanded, 
  onToggle, 
  isLocked,
  isCompleted,
  onSelectContent,
  selectedContentId 
}: { 
  week: Week; 
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isLocked: boolean;
  isCompleted: boolean;
  onSelectContent: (content: ContentItem) => void;
  selectedContentId?: number;
}) {
  const hasQuiz = !!week.quiz;
  
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden" data-testid={`week-accordion-${week.id}`}>
      <button 
        onClick={onToggle}
        className="w-full bg-slate-50 p-4 flex items-center justify-between cursor-pointer hover-elevate transition-colors"
        data-testid={`button-toggle-week-${week.id}`}
        disabled={isLocked}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
            isLocked 
              ? "bg-slate-200 text-slate-400"
              : isCompleted 
                ? "bg-green-500 text-white"
                : "bg-primary text-white"
          )}>
            {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-900">{week.title}</h3>
            <p className="text-sm text-slate-500">
              {week.content?.length || 0} lessons
              {hasQuiz && " · Quiz"}
              {week.quiz?.isFinalExam && " · Final Exam"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLocked ? (
            <Lock className="w-5 h-5 text-slate-400" />
          ) : (
            isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && !isLocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="space-y-2">
                {week.content?.sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectContent(item)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      selectedContentId === item.id 
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                    data-testid={`button-content-${item.id}`}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      selectedContentId === item.id ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {getContentIcon(item.type)}
                    </div>
                    <span className="font-medium">{item.title}</span>
                  </button>
                ))}
                
                {week.quiz && (
                  <Link href={`/quiz/${week.quiz.id}`}>
                    <button
                      className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left hover:bg-amber-50 text-amber-700 border border-amber-200 bg-amber-50/50"
                      data-testid={`button-quiz-${week.quiz.id}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-medium">{week.quiz.title}</span>
                        <p className="text-xs text-amber-600">
                          Pass: {week.quiz.passScorePercent}%
                          {week.quiz.isFinalExam && " · Final Exam"}
                        </p>
                      </div>
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CourseDetails() {
  const [, params] = useRoute("/courses/:slug");
  const slug = params?.slug || "";
  const { data: course, isLoading } = useCourseBySlug(slug);
  const courseId = course?.id || 0;
  const { data: progressData } = useCourseProgress(courseId);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const autoEnrollTriggered = useRef(false);
  
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  const enrollMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/enrollments", { courseId });
    },
    onSuccess: () => {
      toast({ title: "Successfully enrolled!" });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/slug", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "progress"] });
    },
    onError: (err: any) => {
      if (err.message === "Already enrolled") {
        toast({ title: "You are already enrolled in this course" });
      } else {
        toast({ title: "Failed to enroll. Please try again.", variant: "destructive" });
      }
    },
  });

  const handleEnroll = () => {
    if (!user) {
      saveIntent({ type: "enrollment", courseSlug: slug, timestamp: Date.now() });
      navigate("/login");
      return;
    }
    enrollMutation.mutate();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auto_enroll") === "true" && user && courseId && !autoEnrollTriggered.current) {
      autoEnrollTriggered.current = true;
      enrollMutation.mutate();
    }
  }, [user, courseId]);

  const weekUnlockStatus = useMemo(() => {
    const status: Record<number, { unlocked: boolean; completed: boolean }> = {};
    if (progressData?.progress) {
      progressData.progress.forEach(p => {
        status[p.weekId] = { unlocked: p.unlocked, completed: p.completed };
      });
    }
    return status;
  }, [progressData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-slate-400">Loading course...</div>
        </div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-slate-500">Course not found</div>
        </div>
      </div>
    );
  }

  const weeks = (course.weeks as Week[]) || [];
  const totalLessons = weeks.reduce((sum, w) => sum + (w.content?.length || 0), 0);
  const isEnrolled = progressData?.enrolled || false;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pt-20 pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-sm font-medium">
                Professional Course
              </span>
              <span className="flex items-center gap-1 text-slate-400 text-sm">
                <Clock className="w-4 h-4" /> {weeks.length} Weeks
              </span>
              <span className="flex items-center gap-1 text-slate-400 text-sm">
                <BookOpen className="w-4 h-4" /> {totalLessons} Lessons
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 leading-tight text-white" data-testid="text-course-title">
              {course.title}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed mb-8" data-testid="text-course-description">
              {course.description}
            </p>
            
            {!isEnrolled && (
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 h-14 px-8 text-lg rounded-full"
                  data-testid="button-enroll"
                  onClick={handleEnroll}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? "Enrolling..." : `Enroll Now - KES ${course.price.toLocaleString()}`}
                </Button>
              </div>
            )}
            {isEnrolled && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">You are enrolled in this course</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-24">
        {isEnrolled ? (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sticky top-24">
                <h2 className="text-lg font-bold font-display text-slate-900 mb-4">Course Curriculum</h2>
                
                <div className="space-y-3">
                  {weeks.map((week, index) => {
                    const status = weekUnlockStatus[week.id];
                    const isLocked = status ? !status.unlocked : index > 0;
                    const isCompleted = status?.completed || false;
                    
                    return (
                      <WeekAccordion
                        key={week.id}
                        week={week}
                        index={index}
                        isExpanded={expandedWeek === week.id}
                        onToggle={() => setExpandedWeek(expandedWeek === week.id ? null : week.id)}
                        isLocked={isLocked}
                        isCompleted={isCompleted}
                        onSelectContent={setSelectedContent}
                        selectedContentId={selectedContent?.id}
                      />
                    );
                  })}

                  {weeks.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      Course content is being updated. Check back soon!
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2 order-1 lg:order-2">
              {selectedContent ? (
                <ContentPlayer content={selectedContent} />
              ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">Welcome to {course.title}</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                      Select a lesson from the curriculum on the left to begin learning. 
                      Complete each week's content and quiz to unlock the next week.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Course Overview</h2>
                
                <div className="prose prose-slate max-w-none mb-8">
                  <p className="text-slate-600 text-lg">{course.description}</p>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-4">What You'll Learn</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-slate-600">Comprehensive curriculum over {weeks.length} weeks</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-slate-600">{totalLessons} lessons with practical content</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-slate-600">Weekly quizzes to test your knowledge</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-slate-600">Certificate upon completion</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-4">Curriculum Preview</h3>
                <div className="space-y-3">
                  {weeks.map((week, index) => (
                    <div 
                      key={week.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{week.title}</h4>
                        <p className="text-sm text-slate-500">
                          {week.content?.length || 0} lessons
                          {week.quiz && " · Quiz included"}
                        </p>
                      </div>
                      <Lock className="w-5 h-5 text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sticky top-24">
                <div className="text-center mb-6">
                  <p className="text-sm text-slate-500 mb-1">Course Price</p>
                  <p className="text-4xl font-bold text-slate-900">
                    KES {course.price.toLocaleString()}
                  </p>
                </div>
                
                <Button 
                  className="w-full mb-4" 
                  size="lg"
                  data-testid="button-enroll-sidebar"
                >
                  Enroll Now
                </Button>
                

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{weeks.length} weeks of content</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span>{totalLessons} lessons</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Award className="w-4 h-4 text-slate-400" />
                    <span>Certificate included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
