import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// Programs
export function usePrograms() {
  return useQuery({
    queryKey: [api.programs.list.path],
    queryFn: async () => {
      const res = await fetch(api.programs.list.path);
      if (!res.ok) throw new Error("Failed to fetch programs");
      return api.programs.list.responses[200].parse(await res.json());
    },
  });
}

export function useProgram(id: number) {
  return useQuery({
    queryKey: [api.programs.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.programs.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch program");
      return api.programs.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useProgramBySlug(slug: string) {
  return useQuery<any>({
    queryKey: ["/api/programs/slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/programs/slug/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch program");
      return res.json();
    },
    enabled: !!slug,
  });
}

// Courses
export function useCourses() {
  return useQuery({
    queryKey: [api.courses.list.path],
    queryFn: async () => {
      const res = await fetch(api.courses.list.path);
      if (!res.ok) throw new Error("Failed to fetch courses");
      return api.courses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCourse(id: number) {
  return useQuery({
    queryKey: [api.courses.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.courses.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch course");
      return api.courses.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCourseBySlug(slug: string) {
  return useQuery<any>({
    queryKey: ["/api/courses/slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/courses/slug/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch course");
      return res.json();
    },
    enabled: !!slug,
  });
}

interface ProgressItem {
  weekId: number;
  weekNumber: number;
  unlocked: boolean;
  completed: boolean;
}

export function useCourseProgress(courseId: number) {
  return useQuery<{ enrolled: boolean; progress: ProgressItem[] }>({
    queryKey: ["/api/courses", courseId, "progress"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/progress`);
      if (!res.ok) throw new Error("Failed to fetch progress");
      return res.json();
    },
    enabled: !!courseId,
  });
}
