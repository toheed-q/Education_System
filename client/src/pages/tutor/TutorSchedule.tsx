import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Check, X, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TutorSchedule() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status });
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: status === "confirmed" ? "Booking Accepted!" : "Booking Declined",
        description: status === "confirmed" 
          ? "The student has been notified. Get ready for your session!" 
          : "The booking has been declined.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update booking",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
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
  const pendingBookings = allBookings.filter(b => b.status === 'pending');
  const confirmedBookings = allBookings.filter(b => 
    b.status === 'confirmed' && new Date(b.startTime) > new Date()
  );

  const handleAccept = (bookingId: number) => {
    updateStatus.mutate({ bookingId, status: "confirmed" });
  };

  const handleDecline = (bookingId: number) => {
    updateStatus.mutate({ bookingId, status: "cancelled" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
          <p className="text-slate-500">Manage your tutoring sessions</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-8">
            {pendingBookings.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  Pending Requests
                  <Badge variant="secondary">{pendingBookings.length}</Badge>
                </h2>
                <div className="space-y-4">
                  {pendingBookings.map((booking: any) => (
                    <Card key={booking.id} className="border-yellow-200 bg-yellow-50">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
                            <User className="w-7 h-7 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900">
                              {booking.student?.name || "Student"}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(booking.startTime).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <p className="font-bold text-slate-900">
                            KES {(booking.pricePaid || booking.price)?.toLocaleString()}
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="default" 
                              onClick={() => handleAccept(booking.id)}
                              disabled={updateStatus.isPending}
                              data-testid={`button-accept-${booking.id}`}
                            >
                              {updateStatus.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDecline(booking.id)}
                              disabled={updateStatus.isPending}
                              data-testid={`button-decline-${booking.id}`}
                            >
                              {updateStatus.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="w-4 h-4 mr-1" />
                                  Decline
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Sessions</h2>
              {confirmedBookings.length > 0 ? (
                <div className="space-y-4">
                  {confirmedBookings.map((booking: any) => (
                    <Card key={booking.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="w-7 h-7 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900">
                              {booking.student?.name || "Student"}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(booking.startTime).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <p className="font-bold text-slate-900">
                            KES {(booking.pricePaid || booking.price)?.toLocaleString()}
                          </p>
                          <Badge variant="default">Confirmed</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No upcoming sessions</h3>
                    <p className="text-slate-500">When students book you, their sessions will appear here</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
