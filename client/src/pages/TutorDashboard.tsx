import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Calendar, MessageSquare, CheckCircle, Clock, User, TrendingUp, AlertCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function TutorDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const allBookings = (bookings as any[]) || [];
  const upcomingBookings = allBookings.filter(b => 
    new Date(b.startTime) > new Date() && b.status !== 'cancelled'
  );
  const completedBookings = allBookings.filter(b => b.status === 'completed');
  
  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const platformFee = Math.round(totalEarnings * 0.25);
  const netEarnings = totalEarnings - platformFee;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900" data-testid="text-welcome">
            Welcome back, {user.name}!
          </h1>
          <p className="text-slate-500 mt-1">Manage your tutoring sessions and earnings</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Link href="/tutor/earnings">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 cursor-pointer hover-elevate transition-all" data-testid="card-earnings">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Total Earnings</CardTitle>
                <Wallet className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900" data-testid="text-total-earnings">
                  KES {netEarnings.toLocaleString()}
                </div>
                <p className="text-xs text-green-600">After 25% platform fee</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tutor/schedule">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-upcoming">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-upcoming-count">
                  {upcomingBookings.length}
                </div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tutor/schedule">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-completed">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-completed-count">
                  {completedBookings.length}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tutor/messages">
            <Card className="cursor-pointer hover-elevate transition-all" data-testid="card-messages">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-unread-count">{unreadData?.count ?? 0}</div>
                <p className="text-xs text-muted-foreground">Unread</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled tutoring sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.slice(0, 5).map((booking: any) => (
                    <div key={booking.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {booking.student?.name || "Student"}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="w-3 h-3" />
                          {new Date(booking.startTime).toLocaleDateString()} at{" "}
                          {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">
                          KES {booking.price?.toLocaleString() || 0}
                        </p>
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No upcoming sessions</p>
                  <p className="text-sm text-slate-400 mt-1">Students can book you from the marketplace</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Earnings Overview</CardTitle>
              <CardDescription>Your tutoring income summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Gross Earnings</p>
                      <p className="text-sm text-slate-500">From completed sessions</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    KES {totalEarnings.toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Available for Withdrawal</p>
                      <p className="text-sm text-green-600">Your current balance</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-900">
                    KES {netEarnings.toLocaleString()}
                  </p>
                </div>

                <Link href="/tutor/earnings">
                  <Button className="w-full mt-4" data-testid="button-view-earnings">
                    <Wallet className="w-4 h-4 mr-2" />
                    View Earnings Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>Your tutor verification status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-yellow-900">Verification Pending</p>
                <p className="text-sm text-yellow-700">
                  Complete your verification to appear higher in search results and build trust with students.
                </p>
              </div>
              <Link href="/tutor/verification">
                <Button variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100" data-testid="button-get-verified">
                  Get Verified
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
