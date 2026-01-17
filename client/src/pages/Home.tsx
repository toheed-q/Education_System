import { Navigation } from "@/components/Navigation";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, GraduationCap, Video, Users } from "lucide-react";
import heroImage from "@assets/Lernentech_logo_1768655383502.png"; // Using logo as placeholder if hero img not avail

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-6">
                Start Learning Today
              </span>
              <h1 className="text-5xl md:text-7xl font-display font-extrabold text-slate-900 tracking-tight mb-8">
                Master New Skills with <span className="text-blue-600">LernenTech</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                Your gateway to premium education. Access expert-led courses, connect with verified tutors, and earn recognized certifications.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/courses">
                  <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20">
                    Browse Courses
                  </Button>
                </Link>
                <Link href="/tutors">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full border-2 hover:bg-slate-50">
                    Find a Tutor
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-orange-200 rounded-full blur-3xl mix-blend-multiply filter opacity-70 animate-blob" />
          <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-200 rounded-full blur-3xl mix-blend-multiply filter opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-200 rounded-full blur-3xl mix-blend-multiply filter opacity-70 animate-blob animation-delay-4000" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: BookOpen,
                title: "Structured Courses",
                desc: "Follow a proven curriculum designed by industry experts to take you from beginner to pro."
              },
              {
                icon: Users,
                title: "Expert Tutors",
                desc: "Get 1-on-1 guidance from verified tutors who are passionate about your success."
              },
              {
                icon: GraduationCap,
                title: "Earn Certificates",
                desc: "Showcase your achievements with verifiable certificates upon course completion."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold font-display text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            Ready to start your journey?
          </h2>
          <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
            Join thousands of students who are transforming their careers with LernenTech today.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white h-14 px-8 rounded-full text-lg shadow-xl shadow-orange-500/20">
              Get Started for Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </section>
    </div>
  );
}
