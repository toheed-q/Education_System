import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, Shield, GraduationCap, School, Upload, Loader2, Clock, XCircle, FileText, X, Briefcase, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import type { TutorProfile, VerificationRequest } from "@shared/schema";

type SuperCategory = "school_tutoring" | "higher_education" | "professional_skills";
type VerificationStatus = "pending" | "approved" | "rejected" | "not_applied";

const CATEGORY_CONFIG: Record<SuperCategory, {
  title: string;
  description: string;
  fee: number;
  icon: typeof School;
  iconBg: string;
  iconColor: string;
  documentLabel: string;
  requirements: string[];
  visibility: string;
}> = {
  school_tutoring: {
    title: "School Tutoring",
    description: "Primary and secondary school subjects (KCPE/KCSE)",
    fee: 500,
    icon: School,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    documentLabel: "TSC Certificate / Teaching Qualification",
    requirements: [
      "TSC certificate or teaching qualification",
      "National ID verification",
      "Must be verified to be visible"
    ],
    visibility: "Must be verified before students can see you"
  },
  higher_education: {
    title: "Higher Education",
    description: "University and college-level subjects",
    fee: 300,
    icon: GraduationCap,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    documentLabel: "University Degree / Academic Transcript",
    requirements: [
      "University degree or academic transcript",
      "Professional certification (if applicable)",
      "Visible while verification is pending"
    ],
    visibility: "Can be visible while verification is pending"
  },
  professional_skills: {
    title: "Professional Skills",
    description: "Languages, music, art, business skills, etc.",
    fee: 300,
    icon: Briefcase,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    documentLabel: "Professional Certification / Portfolio",
    requirements: [
      "Professional certification or portfolio",
      "Proof of expertise/experience",
      "Visible while verification is pending"
    ],
    visibility: "Can be visible while verification is pending"
  }
};

export default function TutorVerification() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SuperCategory | null>(null);
  const [documentPath, setDocumentPath] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [nationalIdPath, setNationalIdPath] = useState("");
  const [nationalIdName, setNationalIdName] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  const documentInputRef = useRef<HTMLInputElement>(null);
  const nationalIdInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile: uploadDocument, isUploading: isUploadingDocument } = useUpload({
    onSuccess: (response) => {
      setDocumentPath(response.objectPath);
      setDocumentName(response.metadata.name);
      toast({ title: "Document uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload document", variant: "destructive" });
    },
  });

  const { uploadFile: uploadNationalId, isUploading: isUploadingNationalId } = useUpload({
    onSuccess: (response) => {
      setNationalIdPath(response.objectPath);
      setNationalIdName(response.metadata.name);
      toast({ title: "National ID uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload National ID", variant: "destructive" });
    },
  });

  const { data: tutorProfile } = useQuery<TutorProfile>({
    queryKey: ["/api/tutors/my-profile"],
    enabled: !!user && user.role === "tutor",
  });

  const { data: myRequests, isLoading: requestsLoading } = useQuery<VerificationRequest[]>({
    queryKey: ["/api/verification-requests/my"],
    enabled: !!user && user.role === "tutor",
  });

  const submitRequest = useMutation({
    mutationFn: async (data: { verificationType: string; documentUrl: string; nationalIdUrl?: string; additionalNotes?: string }) => {
      const response = await apiRequest("POST", "/api/verification-requests", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verification-requests/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutors/my-profile"] });
      toast({
        title: "Verification Request Submitted!",
        description: "Your verification request has been submitted for review.",
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Failed to submit verification request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setDocumentPath("");
    setDocumentName("");
    setNationalIdPath("");
    setNationalIdName("");
    setAdditionalNotes("");
    setSelectedCategory(null);
  };

  const handleApply = (category: SuperCategory) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG, PNG, GIF, or PDF file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      await uploadDocument(file);
    }
  };

  const handleNationalIdSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG, PNG, GIF, or PDF file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      await uploadNationalId(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedCategory || !documentPath) return;
    
    submitRequest.mutate({
      verificationType: selectedCategory,
      documentUrl: documentPath,
      nationalIdUrl: nationalIdPath || undefined,
      additionalNotes: additionalNotes || undefined,
    });
  };

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

  const requests = myRequests || [];

  const getCategoryStatus = (category: SuperCategory): VerificationStatus => {
    if (!tutorProfile) return "not_applied";
    
    switch (category) {
      case "school_tutoring":
        return (tutorProfile.schoolTutoringStatus as VerificationStatus) || "not_applied";
      case "higher_education":
        return (tutorProfile.higherEducationStatus as VerificationStatus) || "not_applied";
      case "professional_skills":
        return (tutorProfile.professionalSkillsStatus as VerificationStatus) || "not_applied";
      default:
        return "not_applied";
    }
  };

  const getCategoryRequest = (category: SuperCategory): VerificationRequest | undefined => {
    return requests.find(r => r.verificationType === category);
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "not_applied":
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Not Applied</Badge>;
    }
  };

  const getActionButton = (category: SuperCategory, status: VerificationStatus) => {
    const config = CATEGORY_CONFIG[category];
    
    if (status === "approved") {
      return (
        <Button className="w-full" disabled variant="outline">
          <CheckCircle className="w-4 h-4 mr-2" />
          Verified
        </Button>
      );
    }
    
    if (status === "pending") {
      return (
        <Button className="w-full" disabled variant="outline">
          <Clock className="w-4 h-4 mr-2" />
          Under Review
        </Button>
      );
    }
    
    return (
      <Button 
        className="w-full" 
        onClick={() => handleApply(category)}
        data-testid={`button-apply-${category}`}
      >
        <Upload className="w-4 h-4 mr-2" />
        Apply (KES {config.fee})
      </Button>
    );
  };

  const approvedCount = (["school_tutoring", "higher_education", "professional_skills"] as SuperCategory[])
    .filter(cat => getCategoryStatus(cat) === "approved").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Verification</h1>
          <p className="text-slate-500 dark:text-slate-400">Get verified in one or more categories to build trust and attract more students</p>
        </div>

        {approvedCount > 0 && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Shield className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-green-900 dark:text-green-100">Verified Tutor</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You are verified in {approvedCount} {approvedCount === 1 ? "category" : "categories"}
                  </p>
                </div>
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Verified
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {(Object.entries(CATEGORY_CONFIG) as [SuperCategory, typeof CATEGORY_CONFIG[SuperCategory]][]).map(([category, config]) => {
            const status = getCategoryStatus(category);
            const request = getCategoryRequest(category);
            const Icon = config.icon;
            
            return (
              <Card key={category} className={status === "approved" ? "border-green-200 dark:border-green-800" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${config.iconBg} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${config.iconColor}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{config.title}</CardTitle>
                        <CardDescription>{config.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    {getStatusBadge(status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <span className="text-sm font-medium">Verification Fee</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">KES {config.fee}</span>
                    </div>
                    
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                      {config.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>

                    {status === "rejected" && request?.reviewNotes && (
                      <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          <strong>Rejection reason:</strong> {request.reviewNotes}
                        </p>
                      </div>
                    )}

                    <div className="text-xs text-slate-500 dark:text-slate-400 p-2 bg-blue-50 dark:bg-blue-950 rounded">
                      {config.visibility}
                    </div>
                    
                    {getActionButton(category, status)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verification Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-sm font-medium">Verified badge on profile</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-sm font-medium">Higher search ranking</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-sm font-medium">Increased student trust</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {requests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requests.map((request) => {
                  const config = CATEGORY_CONFIG[request.verificationType as SuperCategory];
                  return (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-500" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {config?.title || request.verificationType}
                          </p>
                          <p className="text-xs text-slate-500">
                            Submitted: {new Date(request.submittedAt!).toLocaleDateString()}
                            {request.reviewedAt && ` | Reviewed: ${new Date(request.reviewedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(request.status as VerificationStatus)}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Apply for {selectedCategory ? CATEGORY_CONFIG[selectedCategory].title : ""} Verification
            </DialogTitle>
            <DialogDescription>
              Upload your documents for verification. Fee: KES {selectedCategory ? CATEGORY_CONFIG[selectedCategory].fee : ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {selectedCategory ? CATEGORY_CONFIG[selectedCategory].documentLabel : "Document"} *
              </Label>
              <input
                ref={documentInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleDocumentSelect}
                className="hidden"
              />
              {documentPath ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="flex-1 text-sm text-green-800 dark:text-green-200 truncate">{documentName}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setDocumentPath(""); setDocumentName(""); }}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={isUploadingDocument}
                  data-testid="button-upload-document"
                >
                  {isUploadingDocument ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploadingDocument ? "Uploading..." : "Upload Document (Photo or PDF)"}
                </Button>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a clear photo or PDF of your certificate/degree (max 10MB)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>National ID (Optional but recommended)</Label>
              <input
                ref={nationalIdInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleNationalIdSelect}
                className="hidden"
              />
              {nationalIdPath ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="flex-1 text-sm text-green-800 dark:text-green-200 truncate">{nationalIdName}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setNationalIdPath(""); setNationalIdName(""); }}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => nationalIdInputRef.current?.click()}
                  disabled={isUploadingNationalId}
                  data-testid="button-upload-national-id"
                >
                  {isUploadingNationalId ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploadingNationalId ? "Uploading..." : "Upload National ID (Optional)"}
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
              <Textarea
                id="additionalNotes"
                placeholder="Any additional information you'd like to share..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="resize-none"
                data-testid="input-additional-notes"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Accepted formats:</strong> JPG, PNG, GIF, or PDF. Maximum file size: 10MB.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!documentPath || submitRequest.isPending || isUploadingDocument || isUploadingNationalId}
              data-testid="button-submit-verification"
            >
              {submitRequest.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
