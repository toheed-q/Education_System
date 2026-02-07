import { Navigation } from "@/components/Navigation";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EnrollmentCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");

  const verifyMutation = useMutation({
    mutationFn: async (reference: string) => {
      const response = await apiRequest("POST", "/api/enrollments/verify-payment", { reference });
      return response.json();
    },
    onSuccess: () => {
      setStatus("success");
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
    },
    onError: () => {
      setStatus("failed");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (reference) {
      verifyMutation.mutate(reference);
    } else {
      setStatus("failed");
    }
  }, []);

  const returnSlug = sessionStorage.getItem("enrollment_return_slug") || "/courses";

  const handleContinue = () => {
    sessionStorage.removeItem("enrollment_return_slug");
    navigate(returnSlug);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 max-w-md w-full text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-verifying">
                Verifying Payment...
              </h2>
              <p className="text-slate-500">
                Please wait while we confirm your payment.
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-700 mb-2" data-testid="text-success">
                Enrollment Successful!
              </h2>
              <p className="text-slate-500 mb-6">
                Your payment has been confirmed and you are now enrolled. Start learning right away!
              </p>
              <Button onClick={handleContinue} data-testid="button-continue-learning">
                Continue to Course
              </Button>
            </>
          )}
          {status === "failed" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-700 mb-2" data-testid="text-failed">
                Payment Failed
              </h2>
              <p className="text-slate-500 mb-6">
                We couldn't verify your payment. Please try again or contact support if the issue persists.
              </p>
              <Button onClick={handleContinue} variant="outline" data-testid="button-go-back">
                Go Back
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
