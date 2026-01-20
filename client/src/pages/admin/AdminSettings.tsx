import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Save, AlertTriangle } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function AdminSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (user.role !== 'super_admin') {
    setLocation("/admin/dashboard");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
            <p className="text-slate-500">Configure global platform settings</p>
          </div>
          <Badge variant="destructive">Super Admin Only</Badge>
        </div>

        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <CardTitle>Fee Configuration</CardTitle>
            </div>
            <CardDescription>These settings affect platform revenue and tutor payouts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="platformFee">Platform Fee (%)</Label>
                <Input 
                  id="platformFee" 
                  type="number" 
                  defaultValue={25} 
                  min={0} 
                  max={100}
                  data-testid="input-platform-fee"
                />
                <p className="text-xs text-slate-500">Percentage taken from tutor sessions</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-medium text-slate-900 mb-4">Verification Fees (KES)</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="schoolFee">School Tutoring</Label>
                  <Input 
                    id="schoolFee" 
                    type="number" 
                    defaultValue={500}
                    data-testid="input-school-fee"
                  />
                  <p className="text-xs text-slate-500">Primary and secondary school subjects</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="higherEdFee">Higher Ed / Professional</Label>
                  <Input 
                    id="higherEdFee" 
                    type="number" 
                    defaultValue={300}
                    data-testid="input-higher-ed-fee"
                  />
                  <p className="text-xs text-slate-500">University and professional skills</p>
                </div>
              </div>
            </div>

            <Button data-testid="button-save-fees">
              <Save className="w-4 h-4 mr-2" />
              Save Fee Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input id="siteName" defaultValue="LernenTech" data-testid="input-site-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" type="email" defaultValue="support@lernentech.com" data-testid="input-support-email" />
              </div>
            </div>
            <Button variant="outline" data-testid="button-save-info">
              <Save className="w-4 h-4 mr-2" />
              Save Platform Info
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
