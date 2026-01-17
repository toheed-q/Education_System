import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Booking } from "@shared/routes";

export function useTutors(subject?: string) {
  return useQuery({
    queryKey: [api.tutors.list.path, subject],
    queryFn: async () => {
      let url = api.tutors.list.path;
      if (subject) url += `?subject=${encodeURIComponent(subject)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tutors");
      return api.tutors.list.responses[200].parse(await res.json());
    },
  });
}

export function useTutor(id: number) {
  return useQuery({
    queryKey: [api.tutors.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.tutors.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tutor");
      return api.tutors.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useBookings() {
  return useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await fetch(api.bookings.list.path);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return api.bookings.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const validated = api.bookings.create.input.parse(data);
      const res = await fetch(api.bookings.create.path, {
        method: api.bookings.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create booking");
      return api.bookings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
    },
  });
}
