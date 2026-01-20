import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  CheckCircle, 
  TrendingUp, 
  Calendar,
  Shield,
  Settings,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: programs } = useQuery({
    queryKey: ["/api/programs"],
    enabled: !!user,
  });

  const { data: courses } = useQuery({
    queryKey: ["/api/courses"],
    enabled: !!user,
  });

  const { data: tutors } = useQuery({
    queryKey: ["/api/tutors"],
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

  const isSuperAdmin = user.role === 'super_admin';
  const programsCount = (programs as any[])?.length || 0;
  const coursesCount = (courses as any[])?.length || 0;
  const tutorsCount = (tutors as any[])?.length || 0;
  const pendingVerifications = (tutors as any[])?.filter(t => t.verificationStatus === 'pending').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900" data-testid="text-welcome">
              {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
            </h1>
            <p className="text-slate-500 mt-1">
              {isSuperAdmin 
                ? 'Full platform control and configuration' 
                : 'Manage users, courses, and platform content'
              }
            </p>
          </div>
          {isSuperAdmin && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Super Admin
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Link href="/admin/programs">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-programs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-programs-count">
                  {programsCount}
                </div>
                <p className="text-xs text-muted-foreground">Learning programs</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/courses">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-courses">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-courses-count">
                  {coursesCount}
                </div>
                <p className="text-xs text-muted-foreground">Available courses</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users?role=tutor">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-tutors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tutors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-tutors-count">
                  {tutorsCount}
                </div>
                <p className="text-xs text-muted-foreground">On platform</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/verifications">
            <Card className={`cursor-pointer hover-elevate transition-all ${pendingVerifications > 0 ? "border-yellow-200 bg-yellow-50" : ""}`} data-testid="card-verifications">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
                <CheckCircle className={`h-4 w-4 ${pendingVerifications > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${pendingVerifications > 0 ? 'text-yellow-700' : ''}`} data-testid="text-verifications-count">
                  {pendingVerifications}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-between" data-testid="button-manage-users">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/admin/courses">
                <Button variant="outline" className="w-full justify-between" data-testid="button-manage-courses">
                  <span className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Manage Courses
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/admin/programs">
                <Button variant="outline" className="w-full justify-between" data-testid="button-manage-programs">
                  <span className="flex items-center">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Manage Programs
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              {pendingVerifications > 0 && (
                <Link href="/admin/verifications">
                  <Button className="w-full justify-between bg-yellow-600 hover:bg-yellow-700" data-testid="button-review-verifications">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Review Verifications ({pendingVerifications})
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>Overview of platform activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">Total Revenue</span>
                  </div>
                  <span className="font-bold">KES 0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">Bookings This Month</span>
                  </div>
                  <span className="font-bold">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium">New Users This Month</span>
                  </div>
                  <span className="font-bold">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isSuperAdmin && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                <CardTitle className="text-red-900">Super Admin Controls</CardTitle>
              </div>
              <CardDescription className="text-red-700">
                These settings affect the entire platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-red-600" />
                    <h4 className="font-medium text-slate-900">Platform Fee</h4>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">25%</p>
                  <p className="text-sm text-slate-500">On completed sessions</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-red-600" />
                    <h4 className="font-medium text-slate-900">Verification Fees</h4>
                  </div>
                  <p className="text-sm text-slate-700">School: KES 500</p>
                  <p className="text-sm text-slate-700">Higher Ed: KES 300</p>
                </div>
              </div>
              
              <Link href="/admin/settings">
                <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-red-100 cursor-pointer hover:bg-red-50 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">System Settings</p>
                    <p className="text-sm text-slate-500">Configure platform-wide settings</p>
                  </div>
                  <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100" data-testid="button-system-settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p>Activity log will appear here</p>
              <p className="text-sm text-slate-400 mt-1">User registrations, course enrollments, and bookings</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
