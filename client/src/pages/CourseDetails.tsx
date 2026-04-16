import { Navigation } from "@/components/Navigation";
import { useCourseBySlug, useCourseProgress, useCertificate, useDetailedCourseProgress, useMarkLessonComplete } from "@/hooks/use-content";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, CheckCircle, Lock, PlayCircle, FileText, Video, LinkIcon, ChevronDown, ChevronUp, Award, ExternalLink, Download } from "lucide-react";
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
  videoUrl?: string;
  resources?: { name: string; url: string }[] | null;
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

function linkify(text: string) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          {part} <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    return part;
  });
}

function ResourcesSection({ resources }: { resources?: { name: string; url: string }[] | null }) {
  if (!resources || resources.length === 0) return null;
  return (
    <div className="mt-6 pt-6 border-t border-slate-100">
      <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Download className="w-4 h-4" /> Lesson Resources
      </h5>
      <div className="space-y-2">
        {resources.map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-blue-700 truncate">{r.name}</span>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

function ContentPlayer({ 
  content, 
  onComplete, 
  isCompleted, 
  isPending 
}: { 
  content: ContentItem; 
  onComplete: () => void; 
  isCompleted: boolean; 
  isPending: boolean;
}) {
  const renderMarkComplete = () => (
    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
      <Button
        onClick={onComplete}
        disabled={isCompleted || isPending}
        variant={isCompleted ? "default" : "default"}
        className={cn(
          "rounded-full px-8 py-6 flex items-center gap-2 transition-all duration-300 transform active:scale-95 text-lg font-semibold",
          isCompleted 
            ? "bg-green-600 hover:bg-green-600 text-white cursor-default shadow-lg shadow-green-200" 
            : "bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg"
        )}
      >
        {isCompleted ? (
          <><CheckCircle className="w-5 h-5" /> Completed</>
        ) : (
          isPending ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
              Processing...
            </div>
          ) : "Mark as Complete"
        )}
      </Button>
    </div>
  );

  if (content.type === "reading") {
    return (
      <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <h4 className="text-xl font-bold text-slate-900 mb-6 break-words">{content.title}</h4>
        <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed break-words text-lg">
          {linkify(content.contentText || "")}
        </div>
        <ResourcesSection resources={content.resources} />
        {renderMarkComplete()}
      </div>
    );
  }
  
  if (content.type === "video" && content.contentUrl) {
    const isYoutube = content.contentUrl.includes("youtube.com") || content.contentUrl.includes("youtu.be");
    return (
      <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
        <h4 className="text-xl font-bold text-slate-900 mb-6">{content.title}</h4>
        {isYoutube ? (
          <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden relative group shadow-inner">
            <div className="text-center text-white z-10">
              <PlayCircle className="w-16 h-16 mx-auto mb-2 opacity-50 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110" />
              <p className="text-sm font-medium opacity-75">Watch Lesson Video</p>
              <a href={content.contentUrl} target="_blank" rel="noopener noreferrer" className="text-white transition-colors underline text-sm block mt-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-full font-bold shadow-lg">
                Open on YouTube
              </a>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-40 group-hover:opacity-60 transition-opacity" />
          </div>
        ) : (
          <a href={content.contentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-primary hover:text-primary/80 font-semibold transition-all hover:bg-slate-100">
            <Video className="w-5 h-5" /> Open Lesson Video
          </a>
        )}
        <ResourcesSection resources={content.resources} />
        {renderMarkComplete()}
      </div>
    );
  }
  
  if (content.type === "file" && content.contentUrl) {
    return (
      <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
        <h4 className="text-xl font-bold text-slate-900 mb-6">{content.title}</h4>
        <div className="flex flex-col items-start gap-4">
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl w-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Lesson Resource File</p>
                <p className="text-sm text-slate-500">Download to view the material</p>
              </div>
            </div>
            <a 
              href={content.contentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 py-3 px-6 bg-primary text-white rounded-xl hover:bg-primary/90 font-bold transition-all shadow-md w-full"
            >
              <FileText className="w-5 h-5" />
              Download Resource
            </a>
          </div>
        </div>
        <ResourcesSection resources={content.resources} />
        {renderMarkComplete()}
      </div>
    );
  }
  
  if (content.type === "link" && content.contentUrl) {
    return (
      <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
        <h4 className="text-xl font-bold text-slate-900 mb-6">{content.title}</h4>
        <div className="flex flex-col items-start gap-4">
          <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl w-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <LinkIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900">External Resource Link</p>
                <p className="text-sm text-slate-500 break-all">{content.contentUrl}</p>
              </div>
            </div>
            <a 
              href={content.contentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 py-3 px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-md w-full"
            >
              <ExternalLink className="w-5 h-5" />
              Visit Resource
            </a>
          </div>
        </div>
        <ResourcesSection resources={content.resources} />
        {renderMarkComplete()}
      </div>
    );
  }
  
  return (
    <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
      <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
      <p className="text-slate-500">No preview available for this lesson type.</p>
      {renderMarkComplete()}
    </div>
  );
}

function WeekAccordion({ 
  week, 
  index, 
  isExpanded, 
  onToggle, 
  isLocked,
  isCompleted,
  onSelectContent,
  selectedContentId,
  completedLessonIds = new Set()
}: { 
  week: Week; 
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isLocked: boolean;
  isCompleted: boolean;
  onSelectContent: (content: ContentItem) => void;
  selectedContentId?: number;
  completedLessonIds?: Set<number>;
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
          <div className="text-left min-w-0">
            <h3 className="font-bold text-slate-900 break-words">{week.title}</h3>
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
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group",
                      selectedContentId === item.id 
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                    data-testid={`button-content-${item.id}`}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      selectedContentId === item.id ? "bg-primary text-white" : "bg-slate-100 text-slate-500",
                      completedLessonIds.has(item.id) && selectedContentId !== item.id && "bg-green-100 text-green-600"
                    )}>
                      {completedLessonIds.has(item.id) ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        getContentIcon(item.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block break-words">{item.title}</span>
                      {completedLessonIds.has(item.id) && (
                        <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Completed</span>
                      )}
                    </div>
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
  const { data: detailedProgress } = useDetailedCourseProgress(courseId);
  const { data: certificate } = useCertificate(courseId);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const autoEnrollTriggered = useRef(false);
  
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  const weeks = (course?.weeks as Week[]) || [];
  const totalLessons = weeks.reduce((sum, w) => sum + (w.content?.length || 0), 0);
  const isEnrolled = progressData?.enrolled || false;

  const lessonCompleteMutation = useMarkLessonComplete();

  const completedLessonIds = useMemo(() => {
    const set = new Set<number>();
    if (detailedProgress?.units) {
      detailedProgress.units.forEach(unit => {
        unit.lessons?.forEach(lesson => {
          if (lesson.completed) {
            set.add(lesson.id);
          }
        });
      });
    }
    return set;
  }, [detailedProgress]);

  const handleLessonComplete = (lessonId: number) => {
    if (!lessonId || lessonCompleteMutation.isPending) return;
    
    lessonCompleteMutation.mutate(lessonId, {
      onSuccess: () => {
        // Invalidate both simple and detailed progress queries to sync UI
        queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "progress"] });
        queryClient.invalidateQueries({ queryKey: ["/api/progress/course", courseId] });
        queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      }
    });
  };

  // Auto-complete lesson when opened (Videos/Files only)
  useEffect(() => {
    if (isEnrolled && selectedContent && !completedLessonIds.has(selectedContent.id)) {
      // Don't auto-complete reading or links, let users click "Mark as Read"
      if (selectedContent.type === "video" || selectedContent.type === "file") {
        handleLessonComplete(selectedContent.id);
      }
    }
  }, [selectedContent?.id, isEnrolled, completedLessonIds]);

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/enrollments/initiate-payment", { courseId });
      return response.json();
    },
    onSuccess: (data: { authorizationUrl?: string; reference?: string; isFree?: boolean }) => {
      if (data.isFree) {
        toast({ title: "Successfully enrolled!" });
        queryClient.invalidateQueries({ queryKey: ["/api/courses/slug", slug] });
        return;
      }
      sessionStorage.setItem("enrollment_return_slug", `/courses/${slug}`);
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    },
    onError: (err: any) => {
      if (err.message === "Already enrolled") {
        queryClient.invalidateQueries({ queryKey: ["/api/courses/slug", slug] });
        queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "progress"] });
      } else {
        toast({ title: "Failed to initiate payment. Please try again.", variant: "destructive" });
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

  const isCompleted = useMemo(() => {
    if (!progressData?.progress || progressData.progress.length === 0) return false;
    return progressData.progress.every(p => p.completed);
  }, [progressData]);

  const handleDownloadCertificate = () => {
    if (!certificate) {
      toast({ title: "Certificate is still being processed. Please refresh in a moment." });
      return;
    }
    window.location.href = `/api/certificates/download/${certificate.id}`;
  };

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
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">You are enrolled in this course</span>
                </div>
                {isCompleted && (
                  <Button 
                    onClick={handleDownloadCertificate}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center gap-2 transition-transform hover:scale-105"
                  >
                    <Award className="w-4 h-4" />
                    Download Certificate
                  </Button>
                )}
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
                        completedLessonIds={completedLessonIds}
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
                <ContentPlayer 
                  content={selectedContent} 
                  onComplete={() => handleLessonComplete(selectedContent.id)}
                  isCompleted={completedLessonIds.has(selectedContent.id)}
                  isPending={lessonCompleteMutation.isPending && lessonCompleteMutation.variables === selectedContent.id}
                />
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
                  onClick={handleEnroll}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? "Processing..." : `Enroll Now - KES ${course.price.toLocaleString()}`}
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
