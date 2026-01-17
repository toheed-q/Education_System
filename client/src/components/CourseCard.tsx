import { Link } from "wouter";
import { type Course } from "@shared/schema";
import { Clock, BookOpen, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full"
    >
      <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
        <BookOpen className="w-16 h-16 text-blue-200 group-hover:text-blue-300 transition-colors transform group-hover:scale-110 duration-300" />
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-3">
          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
            Course
          </span>
          <span className="font-display font-bold text-slate-900">
            KES {course.price.toLocaleString()}
          </span>
        </div>

        <h3 className="text-xl font-display font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
          {course.title}
        </h3>
        
        <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-grow">
          {course.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
          <div className="flex items-center text-slate-400 text-sm">
            <Clock className="w-4 h-4 mr-1.5" />
            <span>8 Weeks</span>
          </div>
          
          <Link href={`/courses/${course.id}`}>
            <button className="flex items-center text-blue-600 font-semibold text-sm hover:gap-2 transition-all gap-1">
              View Details <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
