import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Home, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  Award, 
  Users, 
  Settings, 
  LogOut, 
  Wallet,
  CheckCircle,
  BarChart3,
  FileText,
  Shield,
  GraduationCap
} from "lucide-react";
import logo from "@assets/Lernentech_logo_1768655383502.png";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  testId: string;
}

const studentMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home, testId: "nav-dashboard" },
  { title: "My Courses", url: "/dashboard/courses", icon: BookOpen, testId: "nav-courses" },
  { title: "Find Tutors", url: "/tutors", icon: Users, testId: "nav-tutors" },
  { title: "My Bookings", url: "/dashboard/bookings", icon: Calendar, testId: "nav-bookings" },
  { title: "Messages", url: "/dashboard/messages", icon: MessageSquare, testId: "nav-messages" },
  { title: "Certificates", url: "/dashboard/certificates", icon: Award, testId: "nav-certificates" },
];

const tutorMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/tutor/dashboard", icon: Home, testId: "nav-dashboard" },
  { title: "My Schedule", url: "/tutor/schedule", icon: Calendar, testId: "nav-schedule" },
  { title: "Earnings", url: "/tutor/earnings", icon: Wallet, testId: "nav-earnings" },
  { title: "Messages", url: "/tutor/messages", icon: MessageSquare, testId: "nav-messages" },
  { title: "Verification", url: "/tutor/verification", icon: CheckCircle, testId: "nav-verification" },
  { title: "My Profile", url: "/tutor/profile", icon: Users, testId: "nav-profile" },
];

const adminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: Home, testId: "nav-dashboard" },
  { title: "Users", url: "/admin/users", icon: Users, testId: "nav-users" },
  { title: "Courses", url: "/admin/courses", icon: BookOpen, testId: "nav-courses" },
  { title: "Programs", url: "/admin/programs", icon: GraduationCap, testId: "nav-programs" },
  { title: "Verifications", url: "/admin/verifications", icon: CheckCircle, testId: "nav-verifications" },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, testId: "nav-analytics" },
];

const superAdminMenuItems: MenuItem[] = [
  ...adminMenuItems,
  { title: "Settings", url: "/admin/settings", icon: Settings, testId: "nav-settings" },
  { title: "Audit Logs", url: "/admin/logs", icon: FileText, testId: "nav-logs" },
];

function getMenuItems(role: string): MenuItem[] {
  switch (role) {
    case "student":
      return studentMenuItems;
    case "tutor":
      return tutorMenuItems;
    case "admin":
      return adminMenuItems;
    case "super_admin":
      return superAdminMenuItems;
    default:
      return studentMenuItems;
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "student":
      return "Student";
    case "tutor":
      return "Tutor";
    case "admin":
      return "Admin";
    case "super_admin":
      return "Super Admin";
    default:
      return "User";
  }
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "student":
      return "bg-blue-100 text-blue-700";
    case "tutor":
      return "bg-orange-100 text-orange-700";
    case "admin":
      return "bg-purple-100 text-purple-700";
    case "super_admin":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  
  if (!user) return null;
  
  const menuItems = getMenuItems(user.role);
  const roleLabel = getRoleLabel(user.role);
  const roleBadgeColor = getRoleBadgeColor(user.role);
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200">
          <SidebarHeader className="p-4 border-b border-slate-100">
            <Link href="/">
              <img src={logo} alt="LernenTech" className="h-8 cursor-pointer" />
            </Link>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColor}`}>
                  {roleLabel}
                </span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const isActive = location === item.url || 
                      (item.url !== "/dashboard" && item.url !== "/tutor/dashboard" && item.url !== "/admin/dashboard" && location.startsWith(item.url));
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild data-active={isActive}>
                          <Link href={item.url} data-testid={item.testId}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 gap-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            {user.role === "super_admin" && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <Shield className="w-4 h-4" />
                <span className="font-medium">Super Admin Mode</span>
              </div>
            )}
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
