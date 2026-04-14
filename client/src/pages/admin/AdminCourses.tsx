import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Search, Plus, Edit, Eye, List, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const courseFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().min(0, "Price must be positive"),
  programId: z.coerce.number().optional().nullable(),
  published: z.boolean().default(false),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

export default function AdminCourses({ autoOpen = false, ...props }: { autoOpen?: boolean; [key: string]: any }) {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(autoOpen);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      programId: null,
      published: false,
    },
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["/api/courses"],
    enabled: !!user,
  });

  const { data: programs } = useQuery({
    queryKey: ["/api/programs"],
    enabled: !!user,
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      const response = await apiRequest("POST", "/api/courses", {
        ...data,
        programId: data.programId || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Course Created",
        description: "The course has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
      setLocation("/admin/courses");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create course",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CourseFormValues) => {
    createCourseMutation.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const filteredCourses = (courses as any[])?.filter((course: any) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Course Management</h1>
            <p className="text-slate-500">Manage platform courses</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-course">
                <Plus className="w-4 h-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>
                  Add a new course to your learning platform. Students will be able to enroll and access course content.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Introduction to Python" data-testid="input-course-title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe what students will learn in this course..." 
                            className="resize-none"
                            data-testid="input-course-description"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (KES)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="5000" 
                            data-testid="input-course-price"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="programId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program (Optional)</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                          value={field.value?.toString() || "none"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-program">
                              <SelectValue placeholder="Select a program" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Program (Standalone Course)</SelectItem>
                            {(programs as any[])?.map((program: any) => (
                              <SelectItem key={program.id} value={program.id.toString()}>
                                {program.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="published"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Published</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Make this course visible to students
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-published"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createCourseMutation.isPending} data-testid="button-submit-course">
                      {createCourseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Course
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  className="pl-10" 
                  placeholder="Search courses..." 
                  data-testid="input-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="space-y-4">
                {filteredCourses.map((course: any) => (
                  <div key={course.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg" data-testid={`course-item-${course.id}`}>
                    <Link href={`/admin/courses/${course.id}/builder`} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-900 hover:text-purple-600 transition-colors">{course.title}</h3>
                        <p className="text-sm text-slate-500">KES {course.price?.toLocaleString()}</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant={course.published ? 'default' : 'secondary'}>
                        {course.published ? 'Published' : 'Draft'}
                      </Badge>
                      <Link href={`/courses/${course.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-course-${course.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/courses/${course.id}/builder`}>
                        <Button size="icon" variant="ghost" title="Build Course" data-testid={`button-build-course-${course.id}`}>
                          <List className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button size="icon" variant="ghost" data-testid={`button-edit-course-${course.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No courses yet</h3>
                <p className="text-slate-500">Create your first course to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
