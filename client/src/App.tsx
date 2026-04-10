import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Programs from "@/pages/Programs";
import ProgramDetails from "@/pages/ProgramDetails";
import Courses from "@/pages/Courses";
import CourseDetails from "@/pages/CourseDetails";
import Quiz from "@/pages/Quiz";
import Tutors from "@/pages/Tutors";
import TutorProfile from "@/pages/TutorProfile";
import { Login, Register } from "@/pages/Auth";
import StudentDashboard from "@/pages/StudentDashboard";
import StudentCourses from "@/pages/dashboard/StudentCourses";
import StudentBookings from "@/pages/dashboard/StudentBookings";
import StudentMessages from "@/pages/dashboard/StudentMessages";
import StudentCertificates from "@/pages/dashboard/StudentCertificates";
import TutorDashboard from "@/pages/TutorDashboard";
import TutorSchedule from "@/pages/tutor/TutorSchedule";
import TutorEarnings from "@/pages/tutor/TutorEarnings";
import TutorMessages from "@/pages/tutor/TutorMessages";
import TutorVerification from "@/pages/tutor/TutorVerification";
import TutorProfilePage from "@/pages/tutor/TutorProfilePage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminCourses from "@/pages/admin/AdminCourses";
import AdminPrograms from "@/pages/admin/AdminPrograms";
import AdminVerifications from "@/pages/admin/AdminVerifications";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminLogs from "@/pages/admin/AdminLogs";
import EnrollmentCallback from "@/pages/EnrollmentCallback";
import PaymentCallback from "@/pages/PaymentCallback";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/programs" component={Programs} />
      <Route path="/programs/:slug" component={ProgramDetails} />
      <Route path="/courses" component={Courses} />
      <Route path="/courses/:slug" component={CourseDetails} />
      <Route path="/quiz/:id" component={Quiz} />
      <Route path="/tutors" component={Tutors} />
      <Route path="/tutors/:id" component={TutorProfile} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/enrollment/callback" component={EnrollmentCallback} />
      <Route path="/payment/callback" component={PaymentCallback} />
      
      {/* Student dashboard routes */}
      <Route path="/dashboard" component={StudentDashboard} />
      <Route path="/dashboard/courses" component={StudentCourses} />
      <Route path="/dashboard/bookings" component={StudentBookings} />
      <Route path="/dashboard/messages" component={StudentMessages} />
      <Route path="/dashboard/certificates" component={StudentCertificates} />
      
      {/* Tutor dashboard routes */}
      <Route path="/tutor/dashboard" component={TutorDashboard} />
      <Route path="/tutor/schedule" component={TutorSchedule} />
      <Route path="/tutor/earnings" component={TutorEarnings} />
      <Route path="/tutor/messages" component={TutorMessages} />
      <Route path="/tutor/verification" component={TutorVerification} />
      <Route path="/tutor/profile" component={TutorProfilePage} />
      
      {/* Admin dashboard routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/programs" component={AdminPrograms} />
      <Route path="/admin/verifications" component={AdminVerifications} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/logs" component={AdminLogs} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
