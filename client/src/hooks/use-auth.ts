import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { z } from "zod";
import { getIntent, getIntentRedirectPath } from "@/lib/intent";
import { auth, googleProvider } from "@/lib/firebase";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { useEffect, useState } from "react";

type LoginRequest = z.infer<typeof api.auth.login.input>;
type RegisterRequest = z.infer<typeof api.auth.register.input>;

function getRedirectForUser(role: string): string {
  const intent = getIntent();
  if (intent) {
    const path = getIntentRedirectPath(intent);
    return path;
  }
  if (role === 'tutor') return '/tutor/dashboard';
  if (role === 'admin' || role === 'super_admin') return '/admin/dashboard';
  return '/dashboard';
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Sync Firebase state with hook state
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
  }, []);

  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      // First try existing session auth
      const res = await fetch(api.auth.me.path);
      if (res.ok) {
        return api.auth.me.responses[200].parse(await res.json());
      }
      
      // If session fails, try Firebase ID token if available
      const fbUser = auth.currentUser;
      if (fbUser) {
        const token = await fbUser.getIdToken();
        const syncRes = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({}),
        });
        if (syncRes.ok) return await syncRes.json();
      }

      return null;
    },
    retry: false,
  });

  const syncMutation = useMutation({
    mutationFn: async ({ token, role }: { token: string; role?: string }) => {
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Login sync failed");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      setLocation(getRedirectForUser(data.role));
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      // Try local login first to check verification status
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.requiresVerification) {
          return { requiresVerification: true, email: data.email };
        }
      }

      if (res.ok) {
        return await res.json();
      }

      // If local fails, try Firebase login
      try {
        const result = await signInWithEmailAndPassword(auth, credentials.username, credentials.password);
        const token = await result.user.getIdToken();
        return syncMutation.mutateAsync({ token });
      } catch (fbError: any) {
        throw new Error(fbError.message || "Login failed");
      }
    },
    onSuccess: (data) => {
      if (data && !data.requiresVerification) {
        queryClient.setQueryData([api.auth.me.path], data);
        setLocation(getRedirectForUser(data.role));
      }
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const res = await fetch(api.auth.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return await res.json();
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Verification failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      setLocation(getRedirectForUser(data.role));
    }
  });

  const resendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to resend OTP");
      }
      return await res.json();
    }
  });

  const googleLoginMutation = useMutation({
    mutationFn: async (role?: string) => {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      return syncMutation.mutateAsync({ token, role });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut(auth);
      await fetch(api.auth.logout.path, { method: api.auth.logout.method });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      setLocation('/');
    },
  });

  return {
    user,
    isLoading: isLoading || syncMutation.isPending,
    error,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending || syncMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    verifyOtp: verifyOtpMutation.mutateAsync,
    isVerifying: verifyOtpMutation.isPending,
    verifyOtpError: verifyOtpMutation.error,
    resendOtp: resendOtpMutation.mutateAsync,
    isResendingOtp: resendOtpMutation.isPending,
    loginWithGoogle: googleLoginMutation.mutate,
    isLoggingInWithGoogle: googleLoginMutation.isPending,
    logout: logoutMutation.mutate,
  };
}
