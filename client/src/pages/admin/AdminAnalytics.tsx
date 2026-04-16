import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, BookOpen, Award, TrendingUp, ChevronRight,
  ChevronLeft, CheckCircle, Clock, BarChart3, Loader2,
  Target, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgramStat {
  programId: number;
  programTitle: string;
  isStandalone: boolean;
  totalUsers: number;
  completedUsers: number;
  activeUsers: number;
  completionRate: number;
  avgProgress: number;
}

interface CourseStat {
  courseId: number;
  courseTitle: string;
  totalUsers: number;
  completedUsers: number;
  activeUsers: number;
  avgProgress: number;
  completionRate: number;
}

interface QuizStat {
  quizId: number;
  quizTitle: string;
  passThreshold: number;
  isFinalExam: boolean;
  courseId: number;
  courseTitle: string;
  totalAttempts: number;
  passedAttempts: number;
  failedAttempts: number;
  avgScore: number;
  passRate: number;
}

interface QuizAnalytics {
  quizzes: QuizStat[];
  totalAttempts: number;
  passedAttempts: number;
  overallPassRate: number;
  overallAvgScore: number;
  topCourses: { courseId: number; courseTitle: string; passRate: number }[];
}

// ─── Small reusable components ────────────────────────────────────────────────

function ProgressBar({ value, color = "bg-blue-500" }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconColor: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Drill-down: Course + Quiz breakdown for one program ──────────────────────

function ProgramDrillDown({
  program,
  onBack,
}: {
  program: ProgramStat;
  onBack: () => void;
}) {
  const { data: courses, isLoading: coursesLoading } = useQuery<CourseStat[]>({
    queryKey: [`/api/admin/analytics/courses/${program.programId}`],
  });

  const { data: quizData, isLoading: quizLoading } = useQuery<QuizAnalytics>({
    queryKey: [`/api/admin/analytics/quizzes/${program.programId}`],
  });

  const isLoading = coursesLoading || quizLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{program.programTitle}</h2>
          <p className="text-sm text-slate-500">{program.isStandalone ? 'Courses not part of any program' : 'Program drill-down'}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Program summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users}       label="Total Enrolled"   value={program.totalUsers}      sub="all time"           iconColor="bg-blue-50 text-blue-600" />
            <StatCard icon={Clock}       label="In Progress"      value={program.activeUsers}     sub="active learners"    iconColor="bg-amber-50 text-amber-600" />
            <StatCard icon={CheckCircle} label="Completed"        value={program.completedUsers}  sub="finished program"   iconColor="bg-green-50 text-green-600" />
            <StatCard icon={TrendingUp}  label="Completion Rate"  value={`${program.completionRate}%`} sub="of enrolled users" iconColor="bg-purple-50 text-purple-600" />
          </div>

          {/* Course breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Breakdown</CardTitle>
              <CardDescription>Enrollment and completion per course in this program</CardDescription>
            </CardHeader>
            <CardContent>
              {!courses || courses.length === 0 ? (
                <EmptyState message="No courses in this program yet" />
              ) : (
                <div className="space-y-4">
                  {courses.map((c) => (
                    <div key={c.courseId} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{c.courseTitle}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {c.totalUsers} enrolled · {c.completedUsers} completed · avg {c.avgProgress}%
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            c.completionRate >= 70
                              ? "border-green-200 text-green-700 bg-green-50"
                              : c.completionRate >= 40
                              ? "border-amber-200 text-amber-700 bg-amber-50"
                              : "border-slate-200 text-slate-600"
                          }
                        >
                          {c.completionRate}%
                        </Badge>
                      </div>
                      <ProgressBar
                        value={c.completionRate}
                        color={
                          c.completionRate >= 70
                            ? "bg-green-500"
                            : c.completionRate >= 40
                            ? "bg-amber-500"
                            : "bg-slate-400"
                        }
                      />
                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.activeUsers} active</span>
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> {c.completedUsers} done</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quiz performance */}
          {quizData && (
            <>
              {/* Quiz summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Target}      label="Total Attempts"   value={quizData.totalAttempts}    sub="across all quizzes"  iconColor="bg-blue-50 text-blue-600" />
                <StatCard icon={CheckCircle} label="Overall Pass Rate" value={`${quizData.overallPassRate}%`} sub="passed / attempted" iconColor="bg-green-50 text-green-600" />
                <StatCard icon={TrendingUp}  label="Avg Score"        value={`${quizData.overallAvgScore}%`} sub="mean score"         iconColor="bg-purple-50 text-purple-600" />
                <StatCard icon={AlertCircle} label="Failed Attempts"  value={quizData.totalAttempts - quizData.passedAttempts} sub="did not pass" iconColor="bg-red-50 text-red-600" />
              </div>

              {/* Per-quiz table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quiz Performance</CardTitle>
                  <CardDescription>Pass rate and average score per quiz</CardDescription>
                </CardHeader>
                <CardContent>
                  {quizData.quizzes.length === 0 ? (
                    <EmptyState message="No quizzes in this program yet" />
                  ) : (
                    <div className="space-y-3">
                      {quizData.quizzes.map((q) => (
                        <div key={q.quizId} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-800 truncate">{q.quizTitle}</p>
                                {q.isFinalExam && (
                                  <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50 shrink-0">
                                    Final
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{q.courseTitle} · pass threshold: {q.passThreshold}%</p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-sm font-bold text-slate-900">{q.passRate}% pass</p>
                              <p className="text-xs text-slate-500">avg {q.avgScore}%</p>
                            </div>
                          </div>
                          <ProgressBar
                            value={q.passRate}
                            color={q.passRate >= 70 ? "bg-green-500" : q.passRate >= 40 ? "bg-amber-500" : "bg-red-400"}
                          />
                          <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
                            <span>{q.totalAttempts} attempts</span>
                            <span className="text-green-600">{q.passedAttempts} passed</span>
                            <span className="text-red-500">{q.failedAttempts} failed</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top performing courses */}
              {quizData.topCourses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Performing Courses</CardTitle>
                    <CardDescription>Ranked by quiz pass rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {quizData.topCourses.map((c, i) => (
                        <div key={c.courseId} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{c.courseTitle}</p>
                            <ProgressBar value={c.passRate} color="bg-green-500" />
                          </div>
                          <span className="text-sm font-bold text-green-700 shrink-0">{c.passRate}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedProgram, setSelectedProgram] = useState<ProgramStat | null>(null);

  const { data: programs, isLoading: programsLoading } = useQuery<ProgramStat[]>({
    queryKey: ["/api/admin/analytics/programs"],
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  // ── Drill-down view ──
  if (selectedProgram) {
    return (
      <DashboardLayout>
        <ProgramDrillDown program={selectedProgram} onBack={() => setSelectedProgram(null)} />
      </DashboardLayout>
    );
  }

  // ── Summary stats across all programs ──
  const totalEnrolled   = programs?.reduce((s, p) => s + p.totalUsers, 0) ?? 0;
  const totalCompleted  = programs?.reduce((s, p) => s + p.completedUsers, 0) ?? 0;
  const totalActive     = programs?.reduce((s, p) => s + p.activeUsers, 0) ?? 0;
  const overallRate     = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500">Platform-wide enrollment and learning performance</p>
        </div>

        {/* Platform summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users}       label="Total Enrolled"    value={totalEnrolled}       sub="across all programs"    iconColor="bg-blue-50 text-blue-600" />
          <StatCard icon={Clock}       label="In Progress"       value={totalActive}         sub="active learners"        iconColor="bg-amber-50 text-amber-600" />
          <StatCard icon={CheckCircle} label="Completed"         value={totalCompleted}      sub="finished a program"     iconColor="bg-green-50 text-green-600" />
          <StatCard icon={TrendingUp}  label="Overall Completion" value={`${overallRate}%`}  sub="platform completion rate" iconColor="bg-purple-50 text-purple-600" />
        </div>

        {/* Program overview */}
        <Card>
          <CardHeader>
            <CardTitle>Program Overview</CardTitle>
            <CardDescription>Click a program to drill down into courses and quiz performance</CardDescription>
          </CardHeader>
          <CardContent>
            {programsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : !programs || programs.filter(p => p.totalUsers > 0).length === 0 ? (
              <EmptyState message="No enrollments found yet" />
            ) : (
              <div className="space-y-3">
                {programs.filter(p => p.totalUsers > 0).map((p) => (
                  <button
                    key={p.programId}
                    onClick={() => setSelectedProgram(p)}
                    className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-200 rounded-xl transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                          <p className="font-semibold text-slate-900 truncate">{p.programTitle}</p>
                          {p.isStandalone && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">Standalone</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.totalUsers} enrolled</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.activeUsers} active</span>
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> {p.completedUsers} completed</span>
                          <span className="flex items-center gap-1 text-blue-600"><TrendingUp className="w-3 h-3" /> avg {p.avgProgress}% progress</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">{p.completionRate}%</p>
                          <p className="text-xs text-slate-500">completion</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                    <ProgressBar
                      value={p.completionRate}
                      color={
                        p.completionRate >= 70
                          ? "bg-green-500"
                          : p.completionRate >= 40
                          ? "bg-amber-500"
                          : "bg-blue-400"
                      }
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion comparison chart (simple bar visualization) */}
        {programs && programs.filter(p => p.totalUsers > 0).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completion Rate Comparison</CardTitle>
              <CardDescription>Side-by-side completion rates across all programs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {programs.filter(p => p.totalUsers > 0).map((p) => (
                  <div key={p.programId} className="flex items-center gap-4">
                    <p className="text-sm text-slate-700 w-48 shrink-0 truncate" title={p.programTitle}>
                      {p.programTitle}
                    </p>
                    <div className="flex-1">
                      <ProgressBar
                        value={p.completionRate}
                        color={
                          p.completionRate >= 70
                            ? "bg-green-500"
                            : p.completionRate >= 40
                            ? "bg-amber-500"
                            : "bg-blue-400"
                        }
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-12 text-right shrink-0">
                      {p.completionRate}%
                    </span>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> ≥70% high</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 40–69% medium</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> &lt;40% low</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
