import { useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Upload, Trash2, CheckCircle, ImageIcon, Loader2 } from "lucide-react";

interface CertificateTemplate {
  hasTemplate: boolean;
  templateUrl: string | null;
  uploadedAt: string | null;
}

export default function AdminCertificateDesign() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: template, isLoading } = useQuery<CertificateTemplate>({
    queryKey: ["/api/admin/certificate-template"],
    queryFn: async () => {
      const res = await fetch("/api/admin/certificate-template");
      if (!res.ok) throw new Error("Failed to fetch template");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("template", file);
      const res = await fetch("/api/admin/certificate-template", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Template uploaded", description: "All new certificates will use this design." });
      qc.invalidateQueries({ queryKey: ["/api/admin/certificate-template"] });
      setPreview(null);
      setSelectedFile(null);
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/certificate-template", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove template");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Template removed", description: "Certificates will now use the default design." });
      qc.invalidateQueries({ queryKey: ["/api/admin/certificate-template"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PNG or JPG image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = () => {
    if (selectedFile) uploadMutation.mutate(selectedFile);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Certificate Design</h1>
          <p className="text-slate-500 mt-1">
            Upload a custom certificate background. If no template is set, the default design is used.
          </p>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Template</CardTitle>
            <CardDescription>
              {isLoading ? "Loading..." : template?.hasTemplate
                ? "A custom template is active. All new certificates will use it."
                : "No custom template set. Using the default built-in design."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : template?.hasTemplate && template.templateUrl ? (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={template.templateUrl}
                    alt="Current certificate template"
                    className="w-full object-contain max-h-64"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Active
                  </div>
                </div>
                {template.uploadedAt && (
                  <p className="text-xs text-slate-400">
                    Uploaded on {new Date(template.uploadedAt).toLocaleDateString()}
                  </p>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Remove Template
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <Award className="w-8 h-8 text-slate-300" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Default design active</p>
                  <p className="text-xs text-slate-500">Upload a template below to override it</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload New Template */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload New Template</CardTitle>
            <CardDescription>
              Upload a PNG or JPG image (max 5MB). Use landscape A4 dimensions (1123 × 794 px) for best results.
              Student name, course title, date, and verification code will be printed on top of your design.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleFileChange}
            />

            {!preview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg p-10 flex flex-col items-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <div className="bg-slate-100 p-3 rounded-full">
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">Click to select an image</p>
                  <p className="text-xs text-slate-400 mt-1">PNG or JPG · Max 5MB · Landscape A4 recommended</p>
                </div>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <img src={preview} alt="Preview" className="w-full object-contain max-h-64 bg-slate-50" />
                </div>
                <p className="text-xs text-slate-500">
                  Preview of <span className="font-medium">{selectedFile?.name}</span>
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {uploadMutation.isPending ? "Uploading..." : "Save Template"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={uploadMutation.isPending}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info box */}
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Award className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800 space-y-1">
                <p className="font-medium">How it works</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>Your uploaded image is used as the certificate background</li>
                  <li>Student name, course title, issue date and verification ID are printed on top</li>
                  <li>Only affects certificates generated after the upload</li>
                  <li>Remove the template at any time to revert to the default design</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
