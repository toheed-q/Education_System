import { useLocation } from "wouter";
import { type TutorProfile, type User } from "@shared/schema";
import { Star, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TutorCardProps {
  tutor: TutorProfile & { user: User };
}

export function TutorCard({ tutor }: TutorCardProps) {
  const [, navigate] = useLocation();
  
  // Parse subjects safely since it's JSONB
  const subjects = Array.isArray(tutor.subjects) 
    ? tutor.subjects 
    : JSON.parse(tutor.subjects as unknown as string || "[]");

  const handleCardClick = () => {
    navigate(`/tutors/${tutor.id}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleCardClick}
      className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
      data-testid={`card-tutor-${tutor.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400">
          {tutor.user.name.charAt(0)}
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-1">
                {tutor.user.name}
                {tutor.verificationStatus === 'approved' && (
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                )}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                Professional Tutor
              </p>
            </div>
            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-md">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-bold text-yellow-700">4.9</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {subjects.slice(0, 3).map((sub: string) => (
              <span key={sub} className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded-md border border-slate-100">
                {sub}
              </span>
            ))}
            {subjects.length > 3 && (
              <span className="text-xs px-2 py-1 text-slate-400">+{subjects.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600 line-clamp-2">
        {tutor.bio}
      </p>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-slate-900">KES {tutor.hourlyRate}</span>
          <span className="text-xs text-slate-500">/hour</span>
        </div>
        <Button 
          size="sm" 
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
          data-testid={`button-book-tutor-${tutor.id}`}
        >
          Book Now
        </Button>
      </div>
    </motion.div>
  );
}
