import { Navigation } from "@/components/Navigation";
import { useCourse } from "@/hooks/use-content";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, CheckCircle, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function CourseDetails() {
  const [, params] = useRoute("/courses/:id");
  const courseId = parseInt(params?.id || "0");
  const { data: course, isLoading } = useCourse(courseId);

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  if (!course) return <div className="min-h-screen bg-white flex items-center justify-center">Course not found</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      {/* Course Header */}
      <div className="bg-slate-900 text-white pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-full text-sm font-medium">
                Professional Course
              </span>
              <span className="flex items-center gap-1 text-slate-400 text-sm">
                <Clock className="w-4 h-4" /> 8 Weeks Duration
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 leading-tight">
              {course.title}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed mb-8">
              {course.description}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 h-14 px-8 text-lg rounded-full">
                Enroll Now - KES {course.price.toLocaleString()}
              </Button>
              <span className="text-slate-400 text-sm">
                30-day money-back guarantee
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-24">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <h2 className="text-2xl font-bold font-display text-slate-900 mb-6">Course Curriculum</h2>
          
          <div className="space-y-4">
            {course.weeks?.map((week, index) => (
              <motion.div 
                key={week.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="bg-slate-50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-500">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{week.title}</h3>
                      <p className="text-sm text-slate-500">{week.content?.length || 0} lessons</p>
                    </div>
                  </div>
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                {/* Expandable content would go here */}
              </motion.div>
            ))}

            {(!course.weeks || course.weeks.length === 0) && (
              <div className="text-center py-12 text-slate-500">
                Course content is being updated. Check back soon!
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
