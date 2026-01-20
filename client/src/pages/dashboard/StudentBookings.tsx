import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, ArrowRight, Video, MapPin } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function StudentBookings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: bookings, isLoading } = useQuery({
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

  const allBookings = (bookings as any[]) || [];
  const upcomingBookings = allBookings.filter(b => 
    new Date(b.startTime) > new Date() && b.status !== 'cancelled'
  );
  const pastBookings = allBookings.filter(b => 
    new Date(b.startTime) <= new Date() || b.status === 'completed'
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
            <p className="text-slate-500">Manage your tutor sessions</p>
          </div>
          <Link href="/tutors">
            <Button data-testid="button-find-tutor">
              Find a Tutor
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Sessions</h2>
              {upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.map((booking: any) => (
                    <Card key={booking.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-7 h-7 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900">
                              {booking.tutor?.name || "Tutor Session"}
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
                              <Badge variant="outline" className="ml-2">
                                {booking.sessionType === "physical" ? (
                                  <><MapPin className="w-3 h-3 mr-1" /> In-Person</>
                                ) : (
                                  <><Video className="w-3 h-3 mr-1" /> Online</>
                                )}
                              </Badge>
                            </div>
                            {booking.sessionType === "physical" && booking.location && (
                              <p className="text-xs text-slate-400 mt-1">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {booking.location}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">KES {(booking.pricePaid || booking.price)?.toLocaleString()}</p>
                            <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                              {booking.status}
                            </Badge>
                          </div>
                          {booking.sessionType === "online" || !booking.sessionType ? (
                            <Button 
                              size="sm" 
                              onClick={() => booking.meetingLink && window.open(booking.meetingLink, '_blank')} 
                              disabled={!booking.meetingLink}
                              variant={booking.meetingLink ? "default" : "secondary"}
                              data-testid={`button-join-${booking.id}`}
                            >
                              <Video className="w-4 h-4 mr-1" />
                              {booking.meetingLink ? "Join" : "Awaiting Link"}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" data-testid={`button-location-${booking.id}`}>
                              <MapPin className="w-4 h-4 mr-1" />
                              View Location
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No upcoming sessions</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Past Sessions</h2>
              {pastBookings.length > 0 ? (
                <div className="space-y-4">
                  {pastBookings.map((booking: any) => (
                    <Card key={booking.id} className="opacity-75">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                            <User className="w-7 h-7 text-slate-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-700">
                              {booking.tutor?.name || "Tutor Session"}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(booking.startTime).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline">{booking.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-slate-500">No past sessions</p>
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
