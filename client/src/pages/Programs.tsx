import { Navigation } from "@/components/Navigation";
import { usePrograms } from "@/hooks/use-content";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Award, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Programs() {
  const { data: programs, isLoading } = usePrograms();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary text-white pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4" data-testid="text-page-title">
            Learning Programs
          </h1>
          <p className="text-xl text-white/80 max-w-2xl">
            Comprehensive programs designed to take you from beginner to expert. 
            Each program includes multiple courses, hands-on projects, and professional certification.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-24">
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <div key={i} className="h-80 bg-white rounded-2xl animate-pulse shadow-lg" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {programs?.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden group hover:shadow-xl transition-shadow"
                data-testid={`card-program-${program.id}`}
              >
                <div className="h-3 bg-gradient-to-r from-primary to-secondary" />
                <div className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-7 h-7 text-primary" />
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Open Enrollment
                    </span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors" data-testid={`text-program-title-${program.id}`}>
                    {program.title}
                  </h2>
                  
                  <p className="text-slate-600 mb-6 line-clamp-3">
                    {program.description}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      Multiple courses
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Self-paced
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      Certificate
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                    <div>
                      <span className="text-sm text-slate-500">Program Price</span>
                      <p className="text-2xl font-bold text-slate-900" data-testid={`text-program-price-${program.id}`}>
                        KES {program.price.toLocaleString()}
                      </p>
                    </div>
                    <Link href={`/programs/${program.id}`}>
                      <Button className="group/btn" data-testid={`button-view-program-${program.id}`}>
                        View Program
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}

            {programs?.length === 0 && (
              <div className="col-span-2 text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
                <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Programs Yet</h3>
                <p className="text-slate-500">Check back soon for new learning programs.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
