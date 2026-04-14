import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Save, Loader2, BookOpen } from "lucide-react";

interface Unit {
  id: number;
  title: string;
  description?: string | null;
  learningOutcomes?: string | null;
  topicsCovered?: string | null;
  duration?: string | null;
  weekNumber: number;
}

interface UnitDetailsSheetProps {
  unit: Unit;
  courseId: number;
  open: boolean;
  onClose: () => void;
}

export function UnitDetailsSheet({ unit, courseId, open, onClose }: UnitDetailsSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: unit.title,
    description: unit.description ?? "",
    learningOutcomes: unit.learningOutcomes ?? "",
    topicsCovered: unit.topicsCovered ?? "",
    duration: unit.duration ?? "",
  });

  // Sync form if unit prop changes (e.g. after save)
  useEffect(() => {
    setForm({
      title: unit.title,
      description: unit.description ?? "",
      learningOutcomes: unit.learningOutcomes ?? "",
      topicsCovered: unit.topicsCovered ?? "",
      duration: unit.duration ?? "",
    });
  }, [unit.id]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/units/${unit.id}`, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        learningOutcomes: form.learningOutcomes.trim() || null,
        topicsCovered: form.topicsCovered.trim() || null,
        duration: form.duration.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/units`] });
      toast({ title: "Unit Saved", description: "Unit details updated successfully." });
      onClose();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-base">Unit Details</SheetTitle>
              <p className="text-xs text-slate-500 font-normal">Unit {unit.weekNumber}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-5">
          {/* Title */}
          <Field label="Unit Title" required>
            <Input
              placeholder="e.g. Introduction to Python"
              value={form.title}
              onChange={set("title")}
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <Textarea
              placeholder="Brief overview of what this unit covers..."
              rows={3}
              className="resize-none"
              value={form.description}
              onChange={set("description")}
            />
          </Field>

          {/* Learning Outcomes */}
          <Field label="Learning Outcomes" hint="One outcome per line">
            <Textarea
              placeholder={"Understand core Python syntax\nWrite basic functions\nHandle errors with try/except"}
              rows={4}
              className="resize-none font-mono text-sm"
              value={form.learningOutcomes}
              onChange={set("learningOutcomes")}
            />
          </Field>

          {/* Topics Covered */}
          <Field label="Topics Covered" hint="One topic per line">
            <Textarea
              placeholder={"Variables and data types\nControl flow\nFunctions and scope"}
              rows={4}
              className="resize-none font-mono text-sm"
              value={form.topicsCovered}
              onChange={set("topicsCovered")}
            />
          </Field>

          {/* Estimated Duration */}
          <Field label="Estimated Duration">
            <Input
              placeholder="e.g. 2 hours, 45 minutes"
              value={form.duration}
              onChange={set("duration")}
            />
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
              Save Unit
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
