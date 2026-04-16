import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  GraduationCap,
  ChevronRight,
  Plus,
  List,
  UserCheck,
  Clock,
  CreditCard,
  User,
  Search,
  Bell,
  BellOff
} from "lucide-react";
import logo from "@assets/Lernentech_logo_1768655383502.png";

interface SubMenuItem {
  title: string;
  url: string;
  testId: string;
}

interface MenuItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  testId: string;
  subItems?: SubMenuItem[];
}

const studentMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home, testId: "nav-dashboard" },
  { 
    title: "Learning", 
    icon: BookOpen, 
    testId: "nav-learning",
    subItems: [
      { title: "My Courses", url: "/dashboard/courses", testId: "nav-my-courses" },
      { title: "Browse Courses", url: "/courses", testId: "nav-browse-courses" },
      { title: "Programs", url: "/programs", testId: "nav-programs" },
    ]
  },
  { 
    title: "Tutoring", 
    icon: Users, 
    testId: "nav-tutoring",
    subItems: [
      { title: "Find Tutors", url: "/tutors", testId: "nav-find-tutors" },
      { title: "My Bookings", url: "/dashboard/bookings", testId: "nav-bookings" },
      { title: "Messages", url: "/dashboard/messages", testId: "nav-messages" },
    ]
  },
  { title: "Certificates", url: "/dashboard/certificates", icon: Award, testId: "nav-certificates" },
];

const tutorMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/tutor/dashboard", icon: Home, testId: "nav-dashboard" },
  { 
    title: "Schedule", 
    icon: Calendar, 
    testId: "nav-schedule-group",
    subItems: [
      { title: "My Schedule", url: "/tutor/schedule", testId: "nav-schedule" },
      { title: "Pending Requests", url: "/tutor/schedule", testId: "nav-pending" },
    ]
  },
  { 
    title: "Earnings", 
    icon: Wallet, 
    testId: "nav-earnings-group",
    subItems: [
      { title: "Overview", url: "/tutor/earnings", testId: "nav-earnings" },
      { title: "Payout History", url: "/tutor/earnings", testId: "nav-payouts" },
    ]
  },
  { title: "Messages", url: "/tutor/messages", icon: MessageSquare, testId: "nav-messages" },
  { 
    title: "Profile", 
    icon: User, 
    testId: "nav-profile-group",
    subItems: [
      { title: "My Profile", url: "/tutor/profile", testId: "nav-profile" },
      { title: "Verification", url: "/tutor/verification", testId: "nav-verification" },
    ]
  },
];

const adminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: Home, testId: "nav-dashboard" },
  { 
    title: "Users", 
    icon: Users, 
    testId: "nav-users-group",
    subItems: [
      { title: "All Users", url: "/admin/users", testId: "nav-all-users" },
      { title: "Students", url: "/admin/users?role=student", testId: "nav-students" },
      { title: "Tutors", url: "/admin/users?role=tutor", testId: "nav-tutors" },
      { title: "Admins", url: "/admin/users?role=admin", testId: "nav-admins" },
    ]
  },
  { 
    title: "Courses", 
    icon: BookOpen, 
    testId: "nav-courses-group",
    subItems: [
      { title: "All Courses", url: "/admin/courses", testId: "nav-all-courses" },
      { title: "Add Course", url: "/admin/courses/new", testId: "nav-add-course" },
    ]
  },
  { 
    title: "Programs", 
    icon: GraduationCap, 
    testId: "nav-programs-group",
    subItems: [
      { title: "All Programs", url: "/admin/programs", testId: "nav-all-programs" },
      { title: "Add Program", url: "/admin/programs/new", testId: "nav-add-program" },
    ]
  },
  { title: "Verifications", url: "/admin/verifications", icon: CheckCircle, testId: "nav-verifications" },
  { title: "Certificate Design", url: "/admin/certificate-design", icon: Award, testId: "nav-certificate-design" },
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

function MenuItemWithSub({ item, location }: { item: MenuItem; location: string }) {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isAnySubActive = hasSubItems && item.subItems?.some(sub => location === sub.url || location.startsWith(sub.url.split('?')[0]));
  const [isOpen, setIsOpen] = useState(isAnySubActive);

  if (!hasSubItems) {
    const isActive = item.url && (location === item.url || (item.url !== "/dashboard" && item.url !== "/tutor/dashboard" && item.url !== "/admin/dashboard" && location.startsWith(item.url)));
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild data-active={isActive}>
          <Link href={item.url!} data-testid={item.testId}>
            <item.icon className="w-4 h-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton data-testid={item.testId} data-active={isAnySubActive}>
            <item.icon className="w-4 h-4" />
            <span>{item.title}</span>
            <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems?.map((subItem) => {
              const isSubActive = location === subItem.url || location.startsWith(subItem.url.split('?')[0]);
              return (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton asChild data-active={isSubActive}>
                    <Link href={subItem.url} data-testid={subItem.testId}>
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function getMessagesUrl(role: string): string {
  switch (role) {
    case "student":
      return "/dashboard/messages";
    case "tutor":
      return "/tutor/messages";
    default:
      return "/dashboard/messages";
  }
}

interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

function NotificationsPanel({ userId }: { userId: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const { data: notificationsList } = useQuery<NotificationItem[]>({
    queryKey: ["/api/notifications"],
    enabled: !!userId && isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/mark-read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = unreadCountData?.count ?? 0;

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      markReadMutation.mutate();
    }
  }, [unreadCount]);

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium" data-testid="badge-notification-count">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" data-testid="panel-notifications">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notificationsList && notificationsList.length > 0 ? (
            <div>
              {notificationsList.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 border-b last:border-b-0 ${!notif.read ? "bg-accent/30" : ""}`}
                  data-testid={`notification-item-${notif.id}`}
                >
                  <p className="text-sm font-medium">{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(notif.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <BellOff className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  
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
              <img src={logo} alt="LernenTech" className="h-24 w-auto cursor-pointer" />
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
                  {menuItems.map((item) => (
                    <MenuItemWithSub key={item.title} item={item} location={location} />
                  ))}
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
          <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              {user.role === "super_admin" && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Super Admin Mode</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationsPanel userId={user.id} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-700 hidden sm:inline">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "tutor" && (
                    <DropdownMenuItem onClick={() => setLocation("/tutor/profile")} data-testid="menu-profile">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                  )}
                  {(user.role === "admin" || user.role === "super_admin") && (
                    <DropdownMenuItem onClick={() => setLocation("/admin/settings")} data-testid="menu-settings">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-red-600" data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
