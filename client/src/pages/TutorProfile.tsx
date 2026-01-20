import { Navigation } from "@/components/Navigation";
import { useTutor, useCreateBooking } from "@/hooks/use-tutors";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Clock, BookOpen, MessageCircle, Calendar, Award, CheckCircle, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TutorProfile() {
  const [, params] = useRoute("/tutors/:id");
  const tutorId = parseInt(params?.id || "0");
  const { data: tutor, isLoading } = useTutor(tutorId);
  const { user } = useAuth();
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [messageContent, setMessageContent] = useState("");

  const sendMessage = useMutation({
    mutationFn: async (data: { receiverId: number; content: string }) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message Sent!",
        description: "Your message has been sent to the tutor.",
      });
      setMessageOpen(false);
      setMessageContent("");
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!tutor || !messageContent.trim()) return;
    sendMessage.mutate({
      receiverId: tutor.user.id,
      content: messageContent.trim(),
    });
  };

  const handleBookSession = async () => {
    if (!tutor || !selectedDate || !selectedTime) return;
    
    const startTime = new Date(`${selectedDate}T${selectedTime}:00`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour session
    
    try {
      await createBooking.mutateAsync({
        tutorId: tutor.user.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        pricePaid: tutor.hourlyRate,
      });
      
      toast({
        title: "Booking Requested!",
        description: "Your session has been requested. The tutor will confirm soon.",
      });
      
      setBookingOpen(false);
      setSelectedDate("");
      setSelectedTime("");
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Could not create booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-slate-400">Loading tutor profile...</div>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-slate-500">Tutor not found</p>
          <Link href="/tutors">
            <Button variant="outline">Back to Tutors</Button>
          </Link>
        </div>
      </div>
    );
  }

  const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="bg-white border-b border-slate-100 pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-4xl font-bold shrink-0">
              {tutor.user.name.split(' ').map(n => n[0]).join('')}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Verified Tutor
                </span>
                <span className="flex items-center gap-1 text-amber-500 text-sm">
                  <Star className="w-4 h-4 fill-current" />
                  4.8 (24 reviews)
                </span>
              </div>
              
              <h1 className="text-3xl font-display font-bold text-slate-900 mb-2" data-testid="text-tutor-name">
                {tutor.user.name}
              </h1>
              
              <p className="text-lg text-slate-600 mb-4" data-testid="text-tutor-bio">
                {tutor.bio}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {tutor.subjects.map((subject: string, i: number) => (
                  <span 
                    key={i}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium"
                    data-testid={`badge-subject-${i}`}
                  >
                    {subject}
                  </span>
                ))}
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-slate-500">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  KES {tutor.hourlyRate.toLocaleString()}/hour
                </span>
                <span className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  50+ sessions completed
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full md:w-auto" data-testid="button-book-session">
                    <Calendar className="w-5 h-5 mr-2" />
                    Book a Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Book a Session with {tutor.user.name}</DialogTitle>
                    <DialogDescription>
                      Select your preferred date and time for a tutoring session.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        onInput={(e) => setSelectedDate((e.target as HTMLInputElement).value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-booking-date"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Select Time</label>
                      <div className="grid grid-cols-3 gap-2">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={cn(
                              "p-3 rounded-lg border text-center transition-all",
                              selectedTime === time 
                                ? "border-primary bg-primary/5 text-primary" 
                                : "border-slate-200 hover:border-slate-300"
                            )}
                            data-testid={`button-time-${time}`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Session Rate</span>
                        <span className="font-bold text-slate-900">KES {tutor.hourlyRate.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Payment will be collected when the tutor confirms your session.
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    {user ? (
                      <Button 
                        className="w-full"
                        disabled={!selectedDate || !selectedTime || createBooking.isPending}
                        onClick={handleBookSession}
                        data-testid="button-confirm-booking"
                      >
                        {createBooking.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Requesting...
                          </>
                        ) : (
                          "Request Session"
                        )}
                      </Button>
                    ) : (
                      <div className="w-full text-center">
                        <p className="text-sm text-slate-500 mb-2">Please log in to book a session</p>
                        <Link href="/login">
                          <Button className="w-full">Log In</Button>
                        </Link>
                      </div>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="w-full md:w-auto" data-testid="button-message">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Send Message
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Message {tutor.user.name}</DialogTitle>
                    <DialogDescription>
                      Send a message to the tutor. They typically respond within an hour.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4">
                    {user ? (
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Hi! I'm interested in your tutoring services..."
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          className="min-h-[120px] resize-none"
                          data-testid="textarea-message"
                        />
                        <p className="text-xs text-slate-500">
                          You can discuss your learning goals, ask about availability, or inquire about their teaching approach.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <MessageCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 mb-4">Please log in to send a message</p>
                        <Link href="/login">
                          <Button>Log In</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  {user && (
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setMessageOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        disabled={!messageContent.trim() || sendMessage.isPending}
                        onClick={handleSendMessage}
                        data-testid="button-send-message"
                      >
                        {sendMessage.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">About</h2>
              <p className="text-slate-600 leading-relaxed">
                {tutor.bio}
              </p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Reviews</h2>
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                    <span className="text-sm text-slate-500">2 days ago</span>
                  </div>
                  <p className="text-slate-600">"Excellent tutor! Very patient and explains concepts clearly."</p>
                  <p className="text-sm text-slate-400 mt-1">- Mary K.</p>
                </div>
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className={cn("w-4 h-4", i <= 4 ? "fill-current" : "")} />)}
                    </div>
                    <span className="text-sm text-slate-500">1 week ago</span>
                  </div>
                  <p className="text-slate-600">"Helped me improve my grades significantly. Highly recommend!"</p>
                  <p className="text-sm text-slate-400 mt-1">- Peter M.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Response Time</span>
                  <span className="font-medium text-slate-900">Under 1 hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sessions</span>
                  <span className="font-medium text-slate-900">50+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rating</span>
                  <span className="font-medium text-slate-900">4.8/5</span>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-8 h-8 text-amber-600" />
                <h3 className="font-bold text-amber-800">Top Rated</h3>
              </div>
              <p className="text-sm text-amber-700">
                This tutor is in the top 10% based on student ratings and session completions.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
