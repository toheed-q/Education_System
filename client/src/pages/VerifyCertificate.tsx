import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, CheckCircle, Calendar, User, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function VerifyCertificate() {
  const [, params] = useRoute("/verify/:code");
  const code = params?.code;

  const { data: certificate, isLoading, error } = useQuery({
    queryKey: [`/api/certificates/verify/${code}`],
    enabled: !!code,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-600 mb-4">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Certificate Verification</h1>
            <p className="text-slate-600">Official verification of course completion from LernenTech</p>
          </div>

          {isLoading ? (
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur">
              <CardContent className="py-12 flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium">Verifying certificate authenticity...</p>
              </CardContent>
            </Card>
          ) : error || !certificate ? (
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur overflow-hidden">
              <div className="h-2 bg-red-500" />
              <CardContent className="py-12 text-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <ExternalLink className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Certificate Code</h2>
                <p className="text-slate-600 max-w-sm mx-auto">
                  The certificate code <strong>{code}</strong> could not be verified. 
                  Please double-check the code or the link provided.
                </p>
                <Button 
                  onClick={() => window.location.href = "/"}
                  className="mt-8 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-2xl bg-white overflow-hidden transform transition-all hover:scale-[1.01]">
              <div className="h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Certificate Verified</CardTitle>
                    <p className="text-slate-500 text-sm mt-1">Verification Code: {certificate.code}</p>
                  </div>
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    AUTHENTIC
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 group transition-colors hover:bg-slate-100">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Certificate Issued To</p>
                      <p className="text-xl font-bold text-slate-900">{certificate.userName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 group transition-colors hover:bg-slate-100">
                    <div className="bg-indigo-100 text-indigo-600 p-3 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Course Completed</p>
                      <p className="text-xl font-bold text-slate-900">{certificate.courseTitle}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 group transition-colors hover:bg-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <p className="text-sm text-slate-500 font-medium">Completion Date</p>
                      </div>
                      <p className="text-lg font-bold text-slate-900">
                        {format(new Date(certificate.issuedAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-slate-50 group transition-colors hover:bg-slate-100 flex flex-col justify-center items-center overflow-hidden">
                      <Award className="w-12 h-12 text-yellow-500 opacity-20 absolute" />
                      <div className="relative z-10 text-center">
                        <p className="text-sm text-slate-500 font-medium">Status</p>
                        <p className="text-lg font-bold text-green-600 uppercase tracking-wider">Completed</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t pt-8">
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                    <ShieldCheck className="w-6 h-6 text-slate-400 mt-1" />
                    <p className="text-sm text-slate-500 leading-relaxed">
                      This certificate is a verified digital record of completion issued by LernenTech. 
                      The identity of the recipient and their completion of course requirements 
                      have been authenticated through our secure learning platform.
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 flex gap-4">
                  <Button 
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-full h-12"
                    onClick={() => window.open(`/api/certificates/download/${certificate.id}`, '_blank')}
                  >
                    View Official PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-12 text-center text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} LernenTech LMS. All rights reserved.
          </div>
        </div>
      </main>
    </div>
  );
}
