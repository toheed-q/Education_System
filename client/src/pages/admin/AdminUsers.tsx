import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  UserPlus, 
  MoreVertical, 
  Mail, 
  Calendar, 
  Shield, 
  ShieldCheck, 
  Database, 
  Flame,
  RefreshCw,
  FileJson,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface UnifiedUser {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  isVerified: boolean;
  provider: "local" | "firebase";
  isLinked: boolean;
  firebaseMetadata?: {
    uid: string;
    lastSignInTime?: string;
    emailVerified: boolean;
    disabled: boolean;
  };
}

export default function AdminUsers() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, isLoading, refetch, isRefetching } = useQuery<UnifiedUser[]>({
    queryKey: ["/api/admin/users"],
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
          <p className="text-slate-500 font-medium animate-pulse">Initializing Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (!user || !["admin", "super_admin"].includes(user.role)) {
    setLocation("/login");
    return null;
  }

  const filteredUsers = users?.filter(u => {
    // Role filter from query params
    if (roleFilter) {
      if (roleFilter === "admin") {
        if (!["admin", "super_admin"].includes(u.role)) return false;
      } else if (u.role !== roleFilter) {
        return false;
      }
    }

    // Search query filter
    const query = searchQuery.toLowerCase();
    return u.email.toLowerCase().includes(query) ||
           u.name.toLowerCase().includes(query);
  }) || [];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <DashboardLayout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-8 max-w-7xl mx-auto"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              User Management
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl">
              Monitor active sessions and manage authentication sources across PostgreSQL and Firebase.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="bg-white hover:bg-slate-50 border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200/50">
              <UserPlus className="w-4 h-4 mr-2" />
              Provision User
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-indigo-600 text-white overflow-hidden relative group">
            <div className="absolute right-0 top-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
              <Users className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-indigo-100 text-sm font-medium">Total Active Users</CardTitle>
              <div className="text-3xl font-bold">{users?.length || 0}</div>
            </CardHeader>
            <CardContent>
              <p className="text-indigo-200 text-xs">Unified authentication base</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-white overflow-hidden relative group border border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-500 text-sm font-medium">PostgreSQL Source</CardTitle>
              <div className="text-3xl font-bold text-slate-900">
                {users?.filter(u => u.provider === "local").length || 0}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Database className="w-3.5 h-3.5" />
                <span>Primary database records</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group border border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-500 text-sm font-medium">Firebase Integration</CardTitle>
              <div className="text-3xl font-bold text-slate-900">
                {users?.filter(u => u.provider === "firebase" || u.isLinked).length || 0}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 text-xs text-orange-500 font-medium">
                <Flame className="w-3.5 h-3.5" />
                <span>Firebase Authentication</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 bg-white/80 backdrop-blur-sm overflow-hidden border-none">
          <CardHeader className="border-b border-slate-100 bg-white px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                <Input 
                  className="pl-12 h-12 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all rounded-xl" 
                  placeholder="Search by name, email or UID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                  <FileJson className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600/80" />
                <p className="text-slate-400 animate-pulse font-medium">Retrieving users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-24">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No users found</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                  We couldn't find any users matching your current search criteria.
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-8 font-semibold text-slate-600">User Identity</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-center">Authentication</TableHead>
                      <TableHead className="font-semibold text-slate-600">Role & Status</TableHead>
                      <TableHead className="font-semibold text-slate-600">Account Age</TableHead>
                      <TableHead className="pr-8 text-right font-semibold text-slate-600 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredUsers.map((u, idx) => (
                        <motion.tr 
                          key={u.id === -1 ? `fb-${u.email}` : u.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0 }}
                          className="group hover:bg-slate-50/80 transition-colors"
                        >
                          <TableCell className="pl-8 py-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10 border-2 border-slate-100 ring-2 ring-white shadow-sm">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} />
                                <AvatarFallback className="bg-purple-100 text-purple-700 font-bold">
                                  {u.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                                  {u.name}
                                </span>
                                <span className="text-sm text-slate-500 flex items-center gap-1 font-mono">
                                  <Mail className="w-3 h-3" />
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              {u.provider === "firebase" ? (
                                <Badge className="bg-orange-100 text-orange-700 border-none px-2.5 py-0.5 pointer-events-none">
                                  <Flame className="w-3 h-3 mr-1.5 fill-orange-700" />
                                  Firebase
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-none px-2.5 py-0.5 pointer-events-none">
                                  <Database className="w-3 h-3 mr-1.5 fill-blue-700" />
                                  Local DB
                                </Badge>
                              )}
                              {u.isLinked && (
                                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Synced
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {u.role === "admin" || u.role === "super_admin" ? (
                                <Badge className="bg-purple-600 text-white font-bold border-none">
                                  {u.role.replace("_", " ").toUpperCase()}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-500 font-medium border-slate-200 uppercase text-[10px]">
                                  {u.role}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1.5 text-xs">
                                {u.isVerified ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="text-slate-400 flex items-center gap-1 line-through opacity-60">
                                    <XCircle className="w-3 h-3" />
                                    Unverified
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="text-slate-900 font-medium">
                                {format(new Date(u.createdAt), "MMM d, yyyy")}
                              </span>
                              <span className="text-slate-400 text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(u.createdAt), "HH:mm")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-8 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-full">
                                  <MoreVertical className="w-5 h-5 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-slate-200">
                                <DropdownMenuLabel className="text-xs text-slate-400 uppercase tracking-widest px-2 py-1.5">Management</DropdownMenuLabel>
                                <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer">
                                  <Shield className="w-4 h-4 text-purple-500" />
                                  Edit Role & Flags
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                  <XCircle className="w-4 h-4" />
                                  Deactivate Account
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer">
                                  <RefreshCw className="w-4 h-4 text-emerald-500" />
                                  Reset Password
                                </DropdownMenuItem>
                                {u.firebaseMetadata && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <div className="px-2 py-1.5 text-[10px] text-slate-400 font-mono break-all line-clamp-1">
                                      FB_UID: {u.firebaseMetadata.uid}
                                    </div>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="bg-slate-50/30 px-8 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  System Online
                </span>
                <span>Gateway Latency: 42ms</span>
              </div>
              <div className="font-mono">
                BUILD_v2.4.1-STABLE
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
