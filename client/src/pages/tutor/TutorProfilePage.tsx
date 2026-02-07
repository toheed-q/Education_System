import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Camera, X, Plus, School, GraduationCap, Briefcase, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  SCHOOL_TUTORING_SUBJECTS,
  HIGHER_EDUCATION_SUBJECTS,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  type SuperCategory,
} from "@shared/subjectCategories";

const CATEGORY_ICONS: Record<SuperCategory, typeof School> = {
  school_tutoring: School,
  higher_education: GraduationCap,
  professional_skills: Briefcase,
};

const CATEGORY_COLORS: Record<SuperCategory, { badge: string; bg: string }> = {
  school_tutoring: { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", bg: "border-blue-200 dark:border-blue-800" },
  higher_education: { badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", bg: "border-purple-200 dark:border-purple-800" },
  professional_skills: { badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", bg: "border-green-200 dark:border-green-800" },
};

export default function TutorProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SuperCategory | "">("");
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>([]);
  const [higherEdSubjects, setHigherEdSubjects] = useState<string[]>([]);
  const [professionalSubjects, setProfessionalSubjects] = useState<string[]>([]);
  const [professionalInput, setProfessionalInput] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/tutors/my-profile"],
    enabled: !!user && user.role === "tutor",
  });

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setHourlyRate(profile.hourlyRate?.toString() || "");
      setSchoolSubjects(Array.isArray(profile.schoolTutoringSubjects) ? profile.schoolTutoringSubjects : []);
      setHigherEdSubjects(Array.isArray(profile.higherEducationSubjects) ? profile.higherEducationSubjects : []);
      setProfessionalSubjects(Array.isArray(profile.professionalSkillsSubjects) ? profile.professionalSkillsSubjects : []);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/tutors/my-profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutors/my-profile"] });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update profile", variant: "destructive" });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      bio,
      hourlyRate: parseInt(hourlyRate) || 0,
      schoolTutoringSubjects: schoolSubjects,
      higherEducationSubjects: higherEdSubjects,
      professionalSkillsSubjects: professionalSubjects,
    });
  };

  const addSubjectToCategory = (category: SuperCategory, subject: string) => {
    if (!subject.trim()) return;
    if (category === "school_tutoring") {
      if (!schoolSubjects.includes(subject)) setSchoolSubjects([...schoolSubjects, subject]);
    } else if (category === "higher_education") {
      if (!higherEdSubjects.includes(subject)) setHigherEdSubjects([...higherEdSubjects, subject]);
    } else if (category === "professional_skills") {
      if (!professionalSubjects.includes(subject)) setProfessionalSubjects([...professionalSubjects, subject]);
    }
  };

  const removeSubjectFromCategory = (category: SuperCategory, subject: string) => {
    if (category === "school_tutoring") {
      setSchoolSubjects(schoolSubjects.filter(s => s !== subject));
    } else if (category === "higher_education") {
      setHigherEdSubjects(higherEdSubjects.filter(s => s !== subject));
    } else if (category === "professional_skills") {
      setProfessionalSubjects(professionalSubjects.filter(s => s !== subject));
    }
  };

  const getSubjectsForCategory = (category: SuperCategory): string[] => {
    if (category === "school_tutoring") return schoolSubjects;
    if (category === "higher_education") return higherEdSubjects;
    return professionalSubjects;
  };

  const getAvailableSubjects = (category: SuperCategory): readonly string[] => {
    const selected = getSubjectsForCategory(category);
    if (category === "school_tutoring") {
      return SCHOOL_TUTORING_SUBJECTS.filter(s => !selected.includes(s));
    }
    if (category === "higher_education") {
      return HIGHER_EDUCATION_SUBJECTS.filter(s => !selected.includes(s));
    }
    return [];
  };

  const handleProfessionalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = professionalInput.trim().replace(/,$/g, "");
      if (value) {
        addSubjectToCategory("professional_skills", value);
        setProfessionalInput("");
      }
    }
  };

  const handleAddProfessionalSubject = () => {
    const value = professionalInput.trim();
    if (value) {
      addSubjectToCategory("professional_skills", value);
      setProfessionalInput("");
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const totalSubjects = schoolSubjects.length + higherEdSubjects.length + professionalSubjects.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Profile</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your tutor profile and settings</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarFallback className="bg-orange-100 text-orange-600 text-2xl">
                    {user.name?.charAt(0) || "T"}
                  </AvatarFallback>
                </Avatar>
                <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full">
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100 mt-4">{user.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your public tutor profile</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user.name || ""} disabled data-testid="input-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue={user.email} disabled data-testid="input-email" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell students about yourself, your teaching style, and experience..."
                    rows={4}
                    data-testid="input-bio"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Label>Subjects You Teach</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Pick a category, then select your subjects
                      </p>
                    </div>
                    {totalSubjects > 0 && (
                      <Badge variant="secondary">{totalSubjects} subject{totalSubjects !== 1 ? "s" : ""} selected</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category-select">1. Choose a category</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(v) => setSelectedCategory(v as SuperCategory)}
                    >
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select a tutoring category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school_tutoring">
                          <span className="flex items-center gap-2">
                            <School className="w-4 h-4 text-blue-600" />
                            School Tutoring
                          </span>
                        </SelectItem>
                        <SelectItem value="higher_education">
                          <span className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-purple-600" />
                            Higher Education
                          </span>
                        </SelectItem>
                        <SelectItem value="professional_skills">
                          <span className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-green-600" />
                            Professional Skills
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCategory && selectedCategory !== "professional_skills" && (
                    <div className="space-y-2">
                      <Label>2. Select subjects from {CATEGORY_LABELS[selectedCategory]}</Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{CATEGORY_DESCRIPTIONS[selectedCategory]}</p>
                      <Select
                        onValueChange={(v) => {
                          addSubjectToCategory(selectedCategory, v);
                        }}
                        value=""
                      >
                        <SelectTrigger data-testid="select-subject">
                          <SelectValue placeholder="Pick a subject to add..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableSubjects(selectedCategory).map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                          {getAvailableSubjects(selectedCategory).length === 0 && (
                            <div className="px-2 py-4 text-sm text-center text-slate-500">
                              All subjects selected
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedCategory === "professional_skills" && (
                    <div className="space-y-2">
                      <Label>2. Type your professional skills</Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{CATEGORY_DESCRIPTIONS.professional_skills}</p>
                      <div className="flex gap-2">
                        <Input
                          value={professionalInput}
                          onChange={(e) => setProfessionalInput(e.target.value)}
                          onKeyDown={handleProfessionalKeyDown}
                          placeholder="e.g. Excel, Financial Modelling, Project Management..."
                          data-testid="input-professional-subject"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={handleAddProfessionalSubject}
                          disabled={!professionalInput.trim()}
                          data-testid="button-add-professional-subject"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Display selected subjects per category */}
                  {(["school_tutoring", "higher_education", "professional_skills"] as SuperCategory[]).map((cat) => {
                    const subjects = getSubjectsForCategory(cat);
                    if (subjects.length === 0) return null;
                    const Icon = CATEGORY_ICONS[cat];
                    const colors = CATEGORY_COLORS[cat];
                    return (
                      <div key={cat} className={`rounded-md border p-3 space-y-2 ${colors.bg}`}>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <Icon className="w-4 h-4" />
                          {CATEGORY_LABELS[cat]}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {subjects.map((subject) => (
                            <Badge
                              key={subject}
                              variant="secondary"
                              className={`${colors.badge} gap-1 pr-1`}
                              data-testid={`badge-subject-${cat}-${subject}`}
                            >
                              {subject}
                              <button
                                type="button"
                                onClick={() => removeSubjectFromCategory(cat, subject)}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                                data-testid={`button-remove-${cat}-${subject}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate">Hourly Rate (KES)</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="1000"
                    data-testid="input-rate"
                  />
                </div>

                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save">
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
