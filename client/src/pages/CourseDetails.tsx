import { Navigation } from "@/components/Navigation";
import { useCourse, useCourseProgress } from "@/hooks/use-content";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, CheckCircle, Lock, PlayCircle, FileText, Video, LinkIcon, ChevronDown, ChevronUp, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

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
  const [, params] = useRoute("/courses/:id");
  const courseId = parseInt(params?.id || "0");
  const { data: course, isLoading } = useCourse(courseId);
  const { data: progressData } = useCourseProgress(courseId);
  const { user } = useAuth();
  
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

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
            
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 leading-tight" data-testid="text-course-title">
              {course.title}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed mb-8" data-testid="text-course-description">
              {course.description}
            </p>
            
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 h-14 px-8 text-lg rounded-full"
                data-testid="button-enroll"
              >
                Enroll Now - KES {course.price.toLocaleString()}
              </Button>
              <span className="text-slate-400 text-sm">
                30-day money-back guarantee
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-24">
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
      </main>
    </div>
  );
}
