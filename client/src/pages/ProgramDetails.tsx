import { Navigation } from "@/components/Navigation";
import { useProgramBySlug } from "@/hooks/use-content";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Award, Users, ArrowRight, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { saveIntent, getIntent, clearIntent } from "@/lib/intent";

export default function ProgramDetails() {
  const [, params] = useRoute("/programs/:slug");
  const slug = params?.slug || "";
  const { data: program, isLoading } = useProgramBySlug(slug);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const autoEnrollTriggered = useRef(false);

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/enrollments/initiate-payment", { programId: program?.id });
      return response.json();
    },
    onSuccess: (data: { authorizationUrl?: string; reference?: string; isFree?: boolean }) => {
      if (data.isFree) {
        toast({ title: "Successfully enrolled!" });
        queryClient.invalidateQueries({ queryKey: ["/api/programs/slug", slug] });
        return;
      }
      sessionStorage.setItem("enrollment_return_slug", `/programs/${slug}`);
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    },
    onError: (err: any) => {
      if (err.message === "Already enrolled") {
        toast({ title: "You are already enrolled in this program" });
        queryClient.invalidateQueries({ queryKey: ["/api/programs/slug", slug] });
      } else {
        toast({ title: "Failed to initiate payment. Please try again.", variant: "destructive" });
      }
    },
  });

  const handleEnroll = () => {
    if (!user) {
      saveIntent({ type: "enrollment", programSlug: slug, timestamp: Date.now() });
      navigate("/login");
      return;
    }
    enrollMutation.mutate();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auto_enroll") === "true" && user && program?.id && !autoEnrollTriggered.current) {
      autoEnrollTriggered.current = true;
      enrollMutation.mutate();
    }
  }, [user, program?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-slate-400">Loading program...</div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-slate-500">Program not found</p>
          <Link href="/programs">
            <Button variant="outline">Back to Programs</Button>
          </Link>
        </div>
      </div>
    );
  }

  const courses = program.courses || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary text-white pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/programs">
            <span className="text-white/70 hover:text-white text-sm mb-4 inline-block cursor-pointer">
              ← Back to Programs
            </span>
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4" data-testid="text-program-title">
            {program.title}
          </h1>
          
          <p className="text-xl text-white/80 max-w-3xl mb-8">
            {program.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-6 text-white/90">
            <span className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Self-paced Learning
            </span>
            <span className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Certificate Included
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-24">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Program Courses</h2>
              
              {courses.length === 0 ? (
                <p className="text-slate-500">No courses available yet.</p>
              ) : (
                <div className="space-y-4">
                  {courses.map((course: any, index: number) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-slate-100 rounded-xl p-5 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                              {index + 1}
                            </span>
                            <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
                          </div>
                          <p className="text-slate-600 text-sm ml-11">{course.description}</p>
                        </div>
                        <Link href={`/courses/${course.slug}`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-course-${course.id}`}>
                            View
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">What You'll Learn</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-slate-600">Industry-relevant skills and knowledge</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-slate-600">Hands-on projects and exercises</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-slate-600">Expert-led curriculum content</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-slate-600">Career-ready certification</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-24">
              <div className="text-center mb-6">
                <p className="text-sm text-slate-500 mb-1">Program Price</p>
                <p className="text-4xl font-bold text-slate-900" data-testid="text-program-price">
                  KES {program.price.toLocaleString()}
                </p>
              </div>
              
              {program.isEnrolled ? (
                <Button className="w-full mb-4" size="lg" disabled data-testid="button-enrolled">
                  Already Enrolled
                  <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  className="w-full mb-4" 
                  size="lg" 
                  data-testid="button-enroll-program"
                  onClick={handleEnroll}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              
              <p className="text-xs text-slate-500 text-center">
                Get lifetime access to all courses in this program
              </p>
              
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span>{courses.length} courses included</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Learn at your own pace</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Award className="w-4 h-4 text-slate-400" />
                  <span>Certificate upon completion</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Community support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
