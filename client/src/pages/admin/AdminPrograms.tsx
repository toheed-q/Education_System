import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GraduationCap, Search, Plus, Edit, Eye, Loader2, Sparkles } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const programFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().min(0, "Price must be positive"),
  published: z.boolean().default(false),
});

type ProgramFormValues = z.infer<typeof programFormSchema>;

export default function AdminPrograms({ autoOpen = false, ...props }: { autoOpen?: boolean; [key: string]: any }) {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(autoOpen);
  const [searchTerm, setSearchTerm] = useState("");
  const [aiTone, setAiTone] = useState("");
  const { toast } = useToast();

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      published: false,
    },
  });

  const generateDescriptionMutation = useMutation({
    mutationFn: async ({ title, tone }: { title: string; tone?: string }) => {
      const response = await apiRequest("POST", "/api/ai/generate-description", {
        title,
        type: "program",
        tone,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.description) {
        form.setValue("description", data.description);
        toast({
          title: "Description Generated",
          description: "AI has created a description for your program.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate description",
        variant: "destructive",
      });
    },
  });

  const handleGenerateDescription = () => {
    const title = form.getValues("title");
    if (!title || title.length < 3) {
      toast({
        title: "Title Required",
        description: "Please enter a program title first (at least 3 characters)",
        variant: "destructive",
      });
      return;
    }
    generateDescriptionMutation.mutate({ title, tone: aiTone || undefined });
  };

  const { data: programs, isLoading } = useQuery({
    queryKey: ["/api/programs"],
    enabled: !!user,
  });

  const createProgramMutation = useMutation({
    mutationFn: async (data: ProgramFormValues) => {
      const response = await apiRequest("POST", "/api/programs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({
        title: "Program Created",
        description: "The program has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
      setLocation("/admin/programs");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create program",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProgramFormValues) => {
    createProgramMutation.mutate(data);
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

  const filteredPrograms = (programs as any[])?.filter((program: any) =>
    program.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Program Management</h1>
            <p className="text-slate-500">Manage learning programs</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-program">
                <Plus className="w-4 h-4 mr-2" />
                Add Program
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Program</DialogTitle>
                <DialogDescription>
                  Create a learning program that groups multiple courses together. Students can enroll in the entire program.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Full Stack Development Program" data-testid="input-program-title" {...field} />
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
                        <div className="flex items-center justify-between">
                          <FormLabel>Description</FormLabel>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateDescription}
                            disabled={generateDescriptionMutation.isPending}
                            data-testid="button-generate-description"
                          >
                            {generateDescriptionMutation.isPending ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3 mr-1" />
                            )}
                            Generate with AI
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe what this program offers and what students will learn..." 
                            className="resize-none min-h-[100px]"
                            data-testid="input-program-description"
                            {...field} 
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <Input
                            placeholder="Optional: Tell AI how to phrase it (e.g., 'formal', 'friendly and exciting', 'brief')"
                            value={aiTone}
                            onChange={(e) => setAiTone(e.target.value)}
                            className="text-sm"
                            data-testid="input-ai-tone"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter a title above, then click "Generate with AI" to create a description
                          </p>
                        </div>
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
                            placeholder="15000" 
                            data-testid="input-program-price"
                            {...field} 
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          This is the bundle price for all courses in the program
                        </p>
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
                            Make this program visible to students
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
                    <Button type="submit" disabled={createProgramMutation.isPending} data-testid="button-submit-program">
                      {createProgramMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Program
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
                  placeholder="Search programs..." 
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
            ) : filteredPrograms.length > 0 ? (
              <div className="space-y-4">
                {filteredPrograms.map((program: any) => (
                  <div key={program.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg" data-testid={`program-item-${program.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">{program.title}</h3>
                        <p className="text-sm text-slate-500">
                          {program.courseCount || 0} courses | KES {program.price?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={program.published ? 'default' : 'secondary'}>
                        {program.published ? 'Published' : 'Draft'}
                      </Badge>
                      <Link href={`/programs/${program.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-program-${program.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button size="icon" variant="ghost" data-testid={`button-edit-program-${program.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No programs yet</h3>
                <p className="text-slate-500">Create your first program to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
