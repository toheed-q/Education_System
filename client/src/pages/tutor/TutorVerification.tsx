import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, GraduationCap, School, FileText, Upload } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function TutorVerification() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (authLoading) {
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verification</h1>
          <p className="text-slate-500">Get verified to build trust and appear higher in search results</p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
                <Shield className="w-7 h-7 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-yellow-900">Not Verified</h3>
                <p className="text-sm text-yellow-700">Complete verification to unlock all tutor benefits</p>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <School className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>School Tutoring</CardTitle>
                  <CardDescription>Primary and secondary school subjects</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Verify your credentials to tutor students in primary and secondary school subjects.
                </p>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Verification Fee</span>
                  <span className="font-bold text-slate-900">KES 500</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Teaching certificate or degree
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    National ID verification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Background check
                  </li>
                </ul>
                <Button className="w-full" data-testid="button-apply-school">
                  <Upload className="w-4 h-4 mr-2" />
                  Apply for Verification
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Higher Ed / Professional</CardTitle>
                  <CardDescription>University and professional skills</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Verify your expertise to tutor university students or teach professional skills.
                </p>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Verification Fee</span>
                  <span className="font-bold text-slate-900">KES 300</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    University degree or certification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Professional experience proof
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Skills assessment
                  </li>
                </ul>
                <Button className="w-full" variant="outline" data-testid="button-apply-higher">
                  <Upload className="w-4 h-4 mr-2" />
                  Apply for Verification
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verification Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-sm font-medium">Verified badge on profile</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-sm font-medium">Higher search ranking</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-sm font-medium">Increased student trust</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
