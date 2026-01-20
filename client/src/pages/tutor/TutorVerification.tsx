import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, Shield, GraduationCap, School, Upload, Loader2, Clock, XCircle, FileText, X, Image } from "lucide-react";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";

export default function TutorVerification() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"school" | "higher_ed" | null>(null);
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

  const { data: myRequests, isLoading: requestsLoading } = useQuery({
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
    setSelectedType(null);
  };

  const handleApply = (type: "school" | "higher_ed") => {
    setSelectedType(type);
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
    if (!selectedType || !documentPath) return;
    
    submitRequest.mutate({
      verificationType: selectedType,
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

  const requests = (myRequests as any[]) || [];
  const pendingRequest = requests.find(r => r.status === "pending");
  const approvedRequest = requests.find(r => r.status === "approved");
  const rejectedRequest = requests.find(r => r.status === "rejected");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verification</h1>
          <p className="text-slate-500">Get verified to build trust and appear higher in search results</p>
        </div>

        {approvedRequest ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-green-900">Verified Tutor</h3>
                  <p className="text-sm text-green-700">
                    Congratulations! You are a verified {approvedRequest.verificationType === "school" ? "School" : "Higher Ed/Professional"} tutor.
                  </p>
                </div>
                {getStatusBadge("approved")}
              </div>
            </CardContent>
          </Card>
        ) : pendingRequest ? (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-7 h-7 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-yellow-900">Verification In Progress</h3>
                  <p className="text-sm text-yellow-700">
                    Your {pendingRequest.verificationType === "school" ? "School Tutoring" : "Higher Ed/Professional"} verification request is being reviewed.
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Submitted: {new Date(pendingRequest.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                {getStatusBadge("pending")}
              </div>
            </CardContent>
          </Card>
        ) : rejectedRequest ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-red-900">Verification Rejected</h3>
                  <p className="text-sm text-red-700">
                    Your previous verification request was rejected. You can submit a new request.
                  </p>
                  {rejectedRequest.reviewNotes && (
                    <p className="text-xs text-red-600 mt-1">
                      Reason: {rejectedRequest.reviewNotes}
                    </p>
                  )}
                </div>
                {getStatusBadge("rejected")}
              </div>
            </CardContent>
          </Card>
        ) : (
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
        )}

        {!pendingRequest && !approvedRequest && (
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
                  <Button 
                    className="w-full" 
                    onClick={() => handleApply("school")}
                    data-testid="button-apply-school"
                  >
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
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={() => handleApply("higher_ed")}
                    data-testid="button-apply-higher"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Apply for Verification
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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

        {requests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requests.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {request.verificationType === "school" ? "School Tutoring" : "Higher Ed/Professional"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Apply for {selectedType === "school" ? "School Tutoring" : "Higher Ed/Professional"} Verification
            </DialogTitle>
            <DialogDescription>
              Upload your documents for verification. Fee: KES {selectedType === "school" ? "500" : "300"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {selectedType === "school" ? "Teaching Certificate/Degree" : "University Degree/Certification"} *
              </Label>
              <input
                ref={documentInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleDocumentSelect}
                className="hidden"
              />
              {documentPath ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="flex-1 text-sm text-green-800 truncate">{documentName}</span>
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
              <p className="text-xs text-slate-500">
                Upload a clear photo or PDF of your certificate/degree (max 10MB)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>National ID (Optional)</Label>
              <input
                ref={nationalIdInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleNationalIdSelect}
                className="hidden"
              />
              {nationalIdPath ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Image className="w-5 h-5 text-green-600" />
                  <span className="flex-1 text-sm text-green-800 truncate">{nationalIdName}</span>
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
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
