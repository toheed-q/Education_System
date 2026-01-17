import { Navigation } from "@/components/Navigation";
import { TutorCard } from "@/components/TutorCard";
import { useTutors } from "@/hooks/use-tutors";
import { Search, Filter } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Tutors() {
  const [subject, setSubject] = useState("");
  const { data: tutors, isLoading } = useTutors(subject || undefined);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="bg-white border-b border-gray-100 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-display font-bold text-slate-900 mb-4">Find Expert Tutors</h1>
          <p className="text-lg text-slate-500 mb-8 max-w-2xl">
            Get personalized 1-on-1 guidance from verified industry professionals.
          </p>

          <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by subject (e.g. Mathematics, React, Physics)..." 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-[50px] px-6 rounded-xl border-slate-200 text-slate-600">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {tutors?.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
            {tutors?.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-slate-500 text-lg">No tutors found for your search.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
