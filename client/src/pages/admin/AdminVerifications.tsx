import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, User, FileText, Eye, School, GraduationCap, Loader2, Download, Image, File } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function DocumentViewer({ url, label }: { url: string; label: string }) {
  const [showPreview, setShowPreview] = useState(false);
  const isPdf = url.toLowerCase().endsWith('.pdf') || url.includes('application/pdf');
  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.startsWith('/objects/');
  
  const fullUrl = url.startsWith('/') ? url : `/${url}`;

  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors w-full text-left"
        data-testid={`button-view-${label.toLowerCase().replace(/\s/g, '-')}`}
      >
        {isPdf ? <File className="w-5 h-5" /> : <Image className="w-5 h-5" />}
        <span className="flex-1">{label}</span>
        <Eye className="w-4 h-4" />
      </button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {isPdf ? (
              <div className="space-y-4">
                <iframe 
                  src={fullUrl} 
                  className="w-full h-[70vh] border rounded"
                  title={label}
                />
                <a 
                  href={fullUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <img 
                  src={fullUrl} 
                  alt={label}
                  className="max-w-full max-h-[70vh] mx-auto object-contain rounded border"
                />
                <a 
                  href={fullUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <Download className="w-4 h-4" />
                  Open Full Size
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminVerifications() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: verificationRequests, isLoading } = useQuery({
    queryKey: ["/api/admin/verification-requests"],
    enabled: !!user && ["admin", "super_admin"].includes(user.role),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: number; status: string; reviewNotes?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/verification-requests/${id}`, { status, reviewNotes });
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verification-requests"] });
      toast({
        title: status === "approved" ? "Verification Approved!" : "Verification Rejected",
        description: status === "approved" 
          ? "The tutor has been verified successfully." 
          : "The verification request has been rejected.",
      });
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes("");
    },
    onError: () => {
      toast({
        title: "Failed to update status",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const requests = (verificationRequests as any[]) || [];

  const handleReview = (request: any) => {
    setSelectedRequest(request);
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    updateStatus.mutate({ id: selectedRequest.id, status: "approved", reviewNotes });
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    updateStatus.mutate({ id: selectedRequest.id, status: "rejected", reviewNotes });
  };

  const handleQuickApprove = (request: any) => {
    updateStatus.mutate({ id: request.id, status: "approved" });
  };

  const handleQuickReject = (request: any) => {
    updateStatus.mutate({ id: request.id, status: "rejected" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tutor Verifications</h1>
          <p className="text-slate-500">Review and approve tutor verification requests</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{requests.length}</p>
                <p className="text-sm text-slate-500">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {requests.filter((r: any) => r.verificationType === "school").length}
                </p>
                <p className="text-sm text-slate-500">School Tutoring</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {requests.filter((r: any) => r.verificationType === "higher_ed").length}
                </p>
                <p className="text-sm text-slate-500">Higher Ed/Professional</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map((request: any) => (
                  <div key={request.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          request.verificationType === "school" ? "bg-blue-100" : "bg-purple-100"
                        }`}>
                          {request.verificationType === "school" ? (
                            <School className={`w-6 h-6 text-blue-600`} />
                          ) : (
                            <GraduationCap className={`w-6 h-6 text-purple-600`} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">
                            {request.tutorProfile?.user?.name || "Tutor"}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {request.tutorProfile?.user?.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className={
                              request.verificationType === "school" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-purple-100 text-purple-800"
                            }>
                              {request.verificationType === "school" ? "School Tutoring" : "Higher Ed/Professional"}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Fee: KES {request.feeAmountKes}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleReview(request)}
                            data-testid={`button-review-${request.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleQuickApprove(request)}
                            disabled={updateStatus.isPending}
                            data-testid={`button-approve-${request.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleQuickReject(request)}
                            disabled={updateStatus.isPending}
                            data-testid={`button-reject-${request.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Uploaded Documents</h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        <DocumentViewer url={request.documentUrl} label="Main Document" />
                        {request.nationalIdUrl && (
                          <DocumentViewer url={request.nationalIdUrl} label="National ID" />
                        )}
                      </div>
                      {request.additionalNotes && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-slate-700 mb-1">Notes from Tutor</h4>
                          <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{request.additionalNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">All caught up!</h3>
                <p className="text-slate-500">No pending verification requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Verification Request</DialogTitle>
            <DialogDescription>
              Review the uploaded documents and decide whether to approve or reject this verification request.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">
                  {selectedRequest.tutorProfile?.user?.name}
                </h4>
                <p className="text-sm text-slate-600">{selectedRequest.tutorProfile?.user?.email}</p>
                <Badge variant="secondary" className="mt-2">
                  {selectedRequest.verificationType === "school" ? "School Tutoring" : "Higher Ed/Professional"} - KES {selectedRequest.feeAmountKes}
                </Badge>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Uploaded Documents</h4>
                <div className="space-y-3">
                  <DocumentViewer url={selectedRequest.documentUrl} label="Main Document" />
                  {selectedRequest.nationalIdUrl && (
                    <DocumentViewer url={selectedRequest.nationalIdUrl} label="National ID" />
                  )}
                </div>
              </div>
              
              {selectedRequest.additionalNotes && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-1">Notes from Tutor</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{selectedRequest.additionalNotes}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="Add notes for your decision (visible to tutor if rejected)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
              Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
