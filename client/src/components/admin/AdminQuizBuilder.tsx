import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Save, Loader2, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";

interface Question {
  id: number;
  quizId: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

interface Quiz {
  id: number;
  weekId: number;
  title: string;
  passScorePercent: number;
  maxRetakes: number;
  isFinalExam: boolean;
  questions?: Question[];
}

interface QuestionFormState {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOptionIndex: number;
  explanation: string;
}

const emptyQuestion = (): QuestionFormState => ({
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOptionIndex: 0,
  explanation: "",
});

function QuestionEditor({
  question,
  index,
  quizId,
  onSaved,
  onDeleted,
}: {
  question?: Question;
  index: number;
  quizId: number;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const { toast } = useToast();
  const isNew = !question;
  const [expanded, setExpanded] = useState(isNew);
  const [form, setForm] = useState<QuestionFormState>(
    question
      ? {
          questionText: question.questionText,
          optionA: question.options[0] ?? "",
          optionB: question.options[1] ?? "",
          optionC: question.options[2] ?? "",
          optionD: question.options[3] ?? "",
          correctOptionIndex: question.correctOptionIndex,
          explanation: question.explanation ?? "",
        }
      : emptyQuestion()
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const res = await apiRequest("POST", "/api/quiz-questions", { quizId, ...form });
        return res.json();
      } else {
        const res = await apiRequest("PUT", `/api/quiz-questions/${question!.id}`, form);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: isNew ? "Question Added" : "Question Saved" });
      onSaved();
      if (isNew) setForm(emptyQuestion());
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/quiz-questions/${question!.id}`);
    },
    onSuccess: () => {
      toast({ title: "Question Deleted" });
      onDeleted?.();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const optionLabels = ["A", "B", "C", "D"] as const;
  const optionKeys = ["optionA", "optionB", "optionC", "optionD"] as const;

  const isValid =
    form.questionText.trim() &&
    form.optionA.trim() &&
    form.optionB.trim() &&
    form.optionC.trim() &&
    form.optionD.trim();

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 select-none"
        onClick={() => !isNew && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
            {index}
          </span>
          <span className="text-sm font-medium text-slate-800 truncate max-w-xs">
            {form.questionText || "New Question"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Question</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this question.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!isNew &&
            (expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ))}
        </div>
      </div>

      {(expanded || isNew) && (
        <div className="px-4 pb-4 space-y-4 border-t bg-slate-50/40">
          <div className="pt-3">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Question
            </Label>
            <Textarea
              className="mt-1 resize-none bg-white"
              rows={2}
              placeholder="Enter your question..."
              value={form.questionText}
              onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {optionKeys.map((key, i) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question?.id ?? "new"}`}
                  checked={form.correctOptionIndex === i}
                  onChange={() => setForm((f) => ({ ...f, correctOptionIndex: i }))}
                  className="accent-purple-600 shrink-0"
                  title={`Mark option ${optionLabels[i]} as correct`}
                />
                <div className="flex-1 relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {optionLabels[i]}
                  </span>
                  <Input
                    className={`pl-7 bg-white text-sm ${form.correctOptionIndex === i ? "border-green-400 ring-1 ring-green-300" : ""}`}
                    placeholder={`Option ${optionLabels[i]}`}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Explanation (optional)
            </Label>
            <Input
              className="mt-1 bg-white text-sm"
              placeholder="Why is this the correct answer?"
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
            />
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!isValid || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isNew ? "Add Question" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminQuizBuilderProps {
  unitId: number;
  unitTitle: string;
  open: boolean;
  onClose: () => void;
}

export function AdminQuizBuilder({ unitId, unitTitle, open, onClose }: AdminQuizBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = [`/api/units/${unitId}/quiz`];

  const { data: quiz, isLoading } = useQuery<Quiz | null>({
    queryKey,
    enabled: open,
  });

  const [quizForm, setQuizForm] = useState({ title: "", passScorePercent: 70, maxRetakes: 3, isFinalExam: false });

  // Sync form when quiz loads
  const [synced, setSynced] = useState(false);
  if (quiz && !synced) {
    setQuizForm({
      title: quiz.title,
      passScorePercent: quiz.passScorePercent,
      maxRetakes: quiz.maxRetakes,
      isFinalExam: quiz.isFinalExam,
    });
    setSynced(true);
  }
  if (!quiz && synced) setSynced(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createQuizMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quizzes", { weekId: unitId, ...quizForm });
      return res.json();
    },
    onSuccess: () => { toast({ title: "Quiz Created" }); invalidate(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateQuizMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/quizzes/${quiz!.id}`, quizForm);
      return res.json();
    },
    onSuccess: () => { toast({ title: "Quiz Saved" }); invalidate(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/quizzes/${quiz!.id}`);
    },
    onSuccess: () => { toast({ title: "Quiz Deleted" }); invalidate(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const questions: Question[] = quiz?.questions ?? [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <SheetTitle className="text-base">Quiz Builder</SheetTitle>
              <p className="text-xs text-slate-500 font-normal">{unitTitle}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : !quiz ? (
            /* No quiz yet — create form */
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                No quiz for this unit yet. Fill in the details below to create one.
              </div>
              <QuizSettingsForm
                form={quizForm}
                onChange={setQuizForm}
                onSave={() => createQuizMutation.mutate()}
                saving={createQuizMutation.isPending}
                label="Create Quiz"
              />
            </div>
          ) : (
            /* Quiz exists */
            <div className="space-y-6">
              {/* Quiz settings */}
              <div className="bg-white border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Quiz Settings</h3>
                  <div className="flex items-center gap-2">
                    {quiz.isFinalExam && <Badge variant="secondary">Final Exam</Badge>}
                    <Badge variant="outline">{questions.length} questions</Badge>
                  </div>
                </div>
                <QuizSettingsForm
                  form={quizForm}
                  onChange={setQuizForm}
                  onSave={() => updateQuizMutation.mutate()}
                  saving={updateQuizMutation.isPending}
                  label="Save Settings"
                  onDelete={() => deleteQuizMutation.mutate()}
                  deleting={deleteQuizMutation.isPending}
                />
              </div>

              {/* Questions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  Questions
                  <span className="ml-2 text-slate-400 font-normal">({questions.length})</span>
                </h3>

                {questions.map((q, i) => (
                  <QuestionEditor
                    key={q.id}
                    question={q}
                    index={i + 1}
                    quizId={quiz.id}
                    onSaved={invalidate}
                    onDeleted={invalidate}
                  />
                ))}

                {/* Add new question */}
                <div className="border-2 border-dashed border-purple-200 rounded-lg">
                  <div className="px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2 text-purple-600 text-sm font-medium mb-3">
                      <Plus className="w-4 h-4" />
                      Add Question
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <QuestionEditor
                      index={questions.length + 1}
                      quizId={quiz.id}
                      onSaved={invalidate}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function QuizSettingsForm({
  form,
  onChange,
  onSave,
  saving,
  label,
  onDelete,
  deleting,
}: {
  form: { title: string; passScorePercent: number; maxRetakes: number; isFinalExam: boolean };
  onChange: (f: any) => void;
  onSave: () => void;
  saving: boolean;
  label: string;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Title</Label>
        <Input
          className="mt-1"
          placeholder="e.g. Week 1 Quiz"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Pass Score (%)
          </Label>
          <Input
            type="number"
            min={1}
            max={100}
            className="mt-1"
            value={form.passScorePercent}
            onChange={(e) => onChange({ ...form, passScorePercent: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Max Retakes
          </Label>
          <Input
            type="number"
            min={0}
            className="mt-1"
            value={form.maxRetakes}
            onChange={(e) => onChange({ ...form, maxRetakes: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium text-slate-800">Final Exam</p>
          <p className="text-xs text-slate-500">Mark this quiz as the final exam for the course</p>
        </div>
        <Switch
          checked={form.isFinalExam}
          onCheckedChange={(v) => onChange({ ...form, isFinalExam: v })}
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        {onDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Quiz
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete the quiz and all its questions. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700"
          disabled={!form.title.trim() || saving}
          onClick={onSave}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          {label}
        </Button>
      </div>
    </div>
  );
}
