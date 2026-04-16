import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Loader2,
  Video,
  FileText,
  File,
  Link as LinkIcon,
  Plus,
  X,
  Clock,
  Upload,
} from "lucide-react";

interface Resource {
  name: string;
  url: string;
}

interface Lesson {
  id: number;
  title: string;
  type: "video" | "reading" | "file" | "link";
  videoUrl?: string | null;
  contentText?: string | null;
  contentUrl?: string | null;
  resources?: Resource[] | null;
  duration?: string | null;
  sequenceOrder: number;
}

interface LessonEditorSheetProps {
  lesson: Lesson;
  courseId: number;
  open: boolean;
  onClose: () => void;
}

const TYPE_ICONS = {
  video: Video,
  reading: FileText,
  file: File,
  link: LinkIcon,
} as const;

const TYPE_COLORS = {
  video: "bg-red-50 text-red-600",
  reading: "bg-blue-50 text-blue-600",
  file: "bg-orange-50 text-orange-600",
  link: "bg-green-50 text-green-600",
} as const;

export function LessonEditorSheet({ lesson, courseId, open, onClose }: LessonEditorSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: lesson.title,
    type: lesson.type,
    videoUrl: lesson.videoUrl ?? "",
    contentText: lesson.contentText ?? "",
    contentUrl: lesson.contentUrl ?? "",
    duration: lesson.duration ?? "",
  });
  const [resources, setResources] = useState<Resource[]>(
    Array.isArray(lesson.resources) ? lesson.resources : []
  );
  const [newResourceName, setNewResourceName] = useState("");
  const [uploadingResource, setUploadingResource] = useState(false);

  useEffect(() => {
    setForm({
      title: lesson.title,
      type: lesson.type,
      videoUrl: lesson.videoUrl ?? "",
      contentText: lesson.contentText ?? "",
      contentUrl: lesson.contentUrl ?? "",
      duration: lesson.duration ?? "",
    });
    setResources(Array.isArray(lesson.resources) ? lesson.resources : []);
  }, [lesson.id]);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Upload a file and add it as a resource
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = newResourceName.trim() || file.name;
    setUploadingResource(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/lessons/upload-resource", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      setResources((r) => [...r, { name, url: data.url }]);
      setNewResourceName("");
      toast({ title: "File uploaded", description: `${name} added as a resource.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingResource(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeResource = (i: number) =>
    setResources((r) => r.filter((_, idx) => idx !== i));

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        title: form.title.trim(),
        type: form.type,
        duration: form.duration.trim() || null,
        resources: resources.length > 0 ? resources : null,
      };
      if (form.type === "video") {
        payload.videoUrl = form.videoUrl.trim() || null;
        payload.content = form.contentText.trim() || null;
      } else if (form.type === "reading") {
        payload.content = form.contentText.trim() || null;
      } else {
        payload.content = form.contentUrl.trim() || null;
      }
      const res = await apiRequest("PUT", `/api/lessons/${lesson.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/units`] });
      toast({ title: "Lesson Saved" });
      onClose();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const TypeIcon = TYPE_ICONS[form.type];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[form.type]}`}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle className="text-base">Edit Lesson</SheetTitle>
              <p className="text-xs text-slate-500 font-normal truncate max-w-xs">{lesson.title}</p>
            </div>
          </div>
        </SheetHeader>

        {/* Content Type select sits OUTSIDE the overflow-y-auto scroll container
            so its portal is never clipped by an overflow stacking context */}
        <div className="px-6 pt-5 shrink-0">
          <Field label="Content Type">
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v as Lesson["type"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  <span className="flex items-center gap-2"><Video className="w-4 h-4 text-red-500" /> Video</span>
                </SelectItem>
                <SelectItem value="reading">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Reading</span>
                </SelectItem>
                <SelectItem value="file">
                  <span className="flex items-center gap-2"><File className="w-4 h-4 text-orange-500" /> File</span>
                </SelectItem>
                <SelectItem value="link">
                  <span className="flex items-center gap-2"><LinkIcon className="w-4 h-4 text-green-500" /> Link</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Everything else scrolls inside this container */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 space-y-5">
          {/* Title */}
          <Field label="Lesson Title" required>
            <Input
              placeholder="e.g. Introduction to Variables"
              value={form.title}
              onChange={set("title")}
            />
          </Field>

          {/* Video URL */}
          {form.type === "video" && (
            <Field label="Video URL">
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={form.videoUrl}
                onChange={set("videoUrl")}
              />
            </Field>
          )}

          {/* Content URL for file/link */}
          {(form.type === "file" || form.type === "link") && (
            <Field label={form.type === "file" ? "File URL" : "Link URL"}>
              <Input
                placeholder={
                  form.type === "file"
                    ? "https://example.com/document.pdf"
                    : "https://example.com/resource"
                }
                value={form.contentUrl}
                onChange={set("contentUrl")}
              />
            </Field>
          )}

          {/* Content text for reading/video */}
          {(form.type === "reading" || form.type === "video") && (
            <Field
              label={form.type === "reading" ? "Lesson Content" : "Lesson Notes"}
              hint="Supports plain text"
            >
              <Textarea
                placeholder={
                  form.type === "reading"
                    ? "Write the full lesson content here..."
                    : "Add supplementary notes for this video..."
                }
                rows={8}
                className="resize-y font-mono text-sm leading-relaxed"
                value={form.contentText}
                onChange={set("contentText")}
              />
            </Field>
          )}

          {/* Estimated Duration */}
          <Field label="Estimated Duration">
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="e.g. 15 minutes, 1 hour"
                value={form.duration}
                onChange={set("duration")}
              />
            </div>
          </Field>

          {/* Resources — real file upload */}
          <Field label="Resources (PDFs / Files)">
            <div className="space-y-2">
              {/* Existing resources */}
              {resources.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2.5 bg-slate-50 border rounded-md"
                >
                  <File className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate block"
                    >
                      {r.url}
                    </a>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-slate-400 hover:text-red-500 shrink-0"
                    onClick={() => removeResource(i)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}

              {/* Upload new resource */}
              <div className="flex gap-2">
                <Input
                  placeholder="Resource name (optional)"
                  className="text-sm"
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  className="shrink-0 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingResource}
                >
                  {uploadingResource ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingResource ? "Uploading..." : "Upload File"}
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Upload PDFs, slides, or other files for students to download. Max 20MB.
              </p>
            </div>
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!form.title.trim() || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Lesson
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
