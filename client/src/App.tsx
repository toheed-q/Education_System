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
import TutorDashboard from "@/pages/TutorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/programs" component={Programs} />
      <Route path="/programs/:id" component={ProgramDetails} />
      <Route path="/courses" component={Courses} />
      <Route path="/courses/:id" component={CourseDetails} />
      <Route path="/quiz/:id" component={Quiz} />
      <Route path="/tutors" component={Tutors} />
      <Route path="/tutors/:id" component={TutorProfile} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Role-specific dashboards */}
      <Route path="/dashboard" component={StudentDashboard} />
      <Route path="/tutor/dashboard" component={TutorDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      
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
