import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, Award, MessageSquare, ArrowRight, Clock, User } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function StudentDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["/api/enrollments"],
    enabled: !!user,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const upcomingBookings = (bookings as any[])?.filter(b => 
    new Date(b.startTime) > new Date() && b.status !== 'cancelled'
  ).slice(0, 3) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900" data-testid="text-welcome">
            Welcome back, {user.name}!
          </h1>
          <p className="text-slate-500 mt-1">Track your learning progress and upcoming sessions</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Link href="/dashboard/courses">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-courses">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-enrolled-count">
                  {(enrollments as any[])?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active courses</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/bookings">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-sessions">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-sessions-count">
                  {upcomingBookings.length}
                </div>
                <p className="text-xs text-muted-foreground">With tutors</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/certificates">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-certificates">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certificates</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Earned</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/messages">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-messages">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Unread</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Courses</CardTitle>
                <Link href="/courses">
                  <Button variant="ghost" size="sm" data-testid="button-browse-courses">
                    Browse All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription>Your enrolled courses and progress</CardDescription>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (enrollments as any[])?.length > 0 ? (
                <div className="space-y-4">
                  {(enrollments as any[]).slice(0, 3).map((enrollment: any) => (
                    <div key={enrollment.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {enrollment.course?.title || "Course"}
                        </p>
                        <Progress value={enrollment.progress || 0} className="h-2 mt-2" />
                        <p className="text-xs text-slate-500 mt-1">{enrollment.progress || 0}% complete</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-4">You haven't enrolled in any courses yet</p>
                  <Link href="/courses">
                    <Button data-testid="button-start-learning">Start Learning</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming Sessions</CardTitle>
                <Link href="/tutors">
                  <Button variant="ghost" size="sm" data-testid="button-find-tutor">
                    Find Tutor
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription>Your scheduled tutor sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.map((booking: any) => (
                    <div key={booking.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <User className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {booking.tutor?.name || "Tutor Session"}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="w-3 h-3" />
                          {new Date(booking.startTime).toLocaleDateString()} at{" "}
                          {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-4">No upcoming sessions scheduled</p>
                  <Link href="/tutors">
                    <Button variant="outline" data-testid="button-book-session">Book a Session</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
