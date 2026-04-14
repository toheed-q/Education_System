import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit, Trash2, Video, FileText, Link as LinkIcon, File, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LessonEditorSheet } from "./LessonEditorSheet";
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

interface Lesson {
  id: number;
  title: string;
  type: "video" | "reading" | "file" | "link";
  videoUrl?: string | null;
  contentText?: string | null;
  contentUrl?: string | null;
  resources?: any;
  duration?: string | null;
  sequenceOrder: number;
}

interface SortableLessonProps {
  lesson: Lesson;
  courseId: number;
  onUpdate: (id: number, data: { title: string }) => void;
  onDelete: (id: number) => void;
}

const TYPE_ICONS = {
  video: Video,
  reading: FileText,
  file: File,
  link: LinkIcon,
} as const;

const TYPE_COLORS = {
  video: "bg-red-50 text-red-500",
  reading: "bg-blue-50 text-blue-500",
  file: "bg-orange-50 text-orange-500",
  link: "bg-green-50 text-green-500",
} as const;

export function SortableLesson({ lesson, courseId, onUpdate, onDelete }: SortableLessonProps) {
  const [editorOpen, setEditorOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = TYPE_ICONS[lesson.type] ?? FileText;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-3 p-3 bg-white border rounded-md shadow-sm mb-2 hover:border-slate-300 transition-colors ${
          isDragging ? "shadow-lg border-blue-200" : ""
        }`}
      >
        <div {...attributes} {...listeners} className="cursor-grab hover:text-slate-600 transition-colors">
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>

        <div className={`p-1.5 rounded shrink-0 ${TYPE_COLORS[lesson.type]}`}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-700 truncate">{lesson.title}</h4>
          {lesson.duration && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {lesson.duration}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900"
            onClick={() => setEditorOpen(true)}
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{lesson.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(lesson.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <LessonEditorSheet
        lesson={lesson}
        courseId={courseId}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
      />
    </>
  );
}
