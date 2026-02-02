import { useLocation } from "wouter";
import { type TutorProfile, type User } from "@shared/schema";
import { Star, BadgeCheck, School, GraduationCap, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  // Check which categories are verified
  const isSchoolVerified = tutor.schoolTutoringStatus === "approved";
  const isHigherEdVerified = tutor.higherEducationStatus === "approved";
  const isProfessionalVerified = tutor.professionalSkillsStatus === "approved";
  
  // Check which categories are pending (for showing "pending" badge)
  const isHigherEdPending = tutor.higherEducationStatus === "pending";
  const isProfessionalPending = tutor.professionalSkillsStatus === "pending";
  
  // Has at least one verified category
  const hasVerifiedCategory = isSchoolVerified || isHigherEdVerified || isProfessionalVerified;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleCardClick}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
      data-testid={`card-tutor-${tutor.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-400">
          {tutor.user.name.charAt(0)}
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-1">
                {tutor.user.name}
                {hasVerifiedCategory && (
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                )}
              </h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {isSchoolVerified && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs py-0 px-1.5 gap-0.5">
                        <School className="w-3 h-3" />
                        School
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Verified for School Tutoring</TooltipContent>
                  </Tooltip>
                )}
                {isHigherEdVerified && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs py-0 px-1.5 gap-0.5">
                        <GraduationCap className="w-3 h-3" />
                        Higher Ed
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Verified for Higher Education</TooltipContent>
                  </Tooltip>
                )}
                {isProfessionalVerified && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs py-0 px-1.5 gap-0.5">
                        <Briefcase className="w-3 h-3" />
                        Professional
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Verified for Professional Skills</TooltipContent>
                  </Tooltip>
                )}
                {!hasVerifiedCategory && (isHigherEdPending || isProfessionalPending) && (
                  <Badge variant="outline" className="text-xs py-0 px-1.5">
                    Verification Pending
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded-md">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">4.9</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {subjects.slice(0, 3).map((sub: string) => (
              <span key={sub} className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md border border-slate-100 dark:border-slate-700">
                {sub}
              </span>
            ))}
            {subjects.length > 3 && (
              <span className="text-xs px-2 py-1 text-slate-400">+{subjects.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
        {tutor.bio}
      </p>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">KES {tutor.hourlyRate}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">/hour</span>
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
