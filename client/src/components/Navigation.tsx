import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import logo from "@assets/Lernentech_logo_1768655383502.png";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  LogOut, 
  User,
  MessageSquare,
  Calendar
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location === path;

  const links = [
    { href: "/", label: "Home", public: true },
    { href: "/programs", label: "Programs", public: true },
    { href: "/courses", label: "Courses", public: true },
    { href: "/tutors", label: "Find Tutors", public: true },
  ];

  const studentLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/my-courses", label: "My Courses", icon: BookOpen },
    { href: "/my-bookings", label: "Bookings", icon: Calendar },
    { href: "/messages", label: "Messages", icon: MessageSquare },
  ];

  const tutorLinks = [
    { href: "/tutor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tutor/bookings", label: "My Schedule", icon: Calendar },
    { href: "/tutor/requests", label: "Requests", icon: Users },
  ];

  const navLinks = user 
    ? (user.role === 'tutor' ? tutorLinks : studentLinks)
    : links;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
            <img src={logo} alt="LernenTech" className="h-10 w-auto" />
            <span className="text-xl font-display font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent hidden sm:block">
              LernenTech
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link: any) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`text-sm font-medium transition-colors duration-200 flex items-center gap-2
                  ${isActive(link.href) 
                    ? "text-blue-600 font-semibold" 
                    : "text-slate-600 hover:text-blue-600"
                  }`}
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">{user.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => logout()}
                  className="text-slate-500 hover:text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-600 font-medium">Log in</Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 rounded-full px-6">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link: any) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`block px-3 py-2 rounded-lg text-base font-medium
                    ${isActive(link.href)
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    {link.icon && <link.icon className="w-5 h-5" />}
                    {link.label}
                  </div>
                </Link>
              ))}
              
              <div className="border-t border-gray-100 pt-4 mt-4">
                {user ? (
                  <Button 
                    className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" 
                    variant="ghost"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-center">Log in</Button>
                    </Link>
                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full justify-center bg-orange-500 hover:bg-orange-600">
                        Sign up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
