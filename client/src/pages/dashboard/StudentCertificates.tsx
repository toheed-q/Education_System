import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ArrowRight, Download, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Certificate, Course, Program } from "@shared/schema";

export default function StudentCertificates() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: certificates, isLoading: certsLoading } = useQuery<(Certificate & { course?: Course, program?: Program })[]>({
    queryKey: [api.certificates.list.path],
    queryFn: async () => {
      const res = await fetch(api.certificates.list.path);
      if (!res.ok) throw new Error("Failed to fetch certificates");
      return res.json();
    },
    enabled: !!user,
  });

  const handleDownload = (certId: number) => {
    window.open(buildUrl(api.certificates.download.path, { certificateId: certId }), "_blank");
  };

  if (authLoading || certsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
          <h1 className="text-2xl font-bold text-slate-900">My Certificates</h1>
          <p className="text-slate-500">Official recognized documents for your completed course programs</p>
        </div>

        {certificates && certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="overflow-hidden border-slate-200 hover:border-blue-300 transition-colors">
                <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center relative overflow-hidden">
                  <Award className="w-16 h-16 text-white/20 absolute -right-2 -bottom-2" />
                  <div className="p-4 text-center">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full inline-block mb-2">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold text-slate-900 line-clamp-2 min-h-[3rem] mb-1">
                    {cert.course?.title || cert.program?.title || "Educational Completion"}
                  </h3>
                  <div className="flex items-center text-xs text-slate-500 mb-4">
                    <span>Issued {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : "Recently"}</span>
                    <span className="mx-2">•</span>
                    <span className="font-mono uppercase">{cert.code}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                    onClick={() => handleDownload(cert.id)}
                  >
                    Download PDF
                    <Download className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-slate-200 shadow-none">
            <CardContent className="py-20 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No certificates yet</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                Your certificates will appear here once you successfully complete all units and requirements of a course.
              </p>
              <Link href="/courses">
                <Button className="bg-blue-600 hover:bg-blue-700 h-11 px-8">
                  Browse Courses
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
