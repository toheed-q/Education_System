import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, ChevronDown, ChevronRight, Edit2, ClipboardList, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { SortableLesson } from "./SortableLesson";
import { AdminQuizBuilder } from "./AdminQuizBuilder";
import { UnitDetailsSheet } from "./UnitDetailsSheet";
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

interface Unit {
  id: number;
  title: string;
  description?: string | null;
  learningOutcomes?: string | null;
  topicsCovered?: string | null;
  duration?: string | null;
  weekNumber: number;
  lessons?: Lesson[];
}

interface SortableUnitProps {
  unit: Unit;
  courseId: number;
  expanded: boolean;
  onToggleExpand: (id: number) => void;
  onUpdateUnit: (id: number, data: { title: string }) => void;
  onDeleteUnit: (id: number) => void;
  onCreateLesson: (unitId: number) => void;
  onUpdateLesson: (lessonId: number, data: { title: string }) => void;
  onDeleteLesson: (lessonId: number) => void;
}

export function SortableUnit({
  unit,
  courseId,
  expanded,
  onToggleExpand,
  onUpdateUnit,
  onDeleteUnit,
  onCreateLesson,
  onUpdateLesson,
  onDeleteLesson,
}: SortableUnitProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(unit.title);
  const [quizBuilderOpen, setQuizBuilderOpen] = useState(false);
  const [unitDetailsOpen, setUnitDetailsOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: unit.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  };

  const handleUpdateUnit = () => {
    if (title.trim() && title !== unit.title) {
      onUpdateUnit(unit.id, { title });
    }
    setIsEditing(false);
  };

  const sortedLessons = [...(unit.lessons || [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  return (
    <div ref={setNodeRef} style={style} className="mb-6">
      <Card
        className={`border-l-4 border-l-purple-500 overflow-hidden ${
          isDragging ? "shadow-xl opacity-50" : "shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2 p-4 bg-slate-50/50">
          <div {...attributes} {...listeners} className="cursor-grab hover:text-slate-600 p-1">
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onToggleExpand(unit.id)}
          >
            {expanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </Button>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleUpdateUnit}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateUnit()}
                autoFocus
                className="h-9 font-semibold text-base ring-2 ring-purple-500 border-purple-500"
              />
            ) : (
              <h3
                className="text-base font-semibold text-slate-900 truncate cursor-text flex items-center gap-2 group"
                onClick={() => setIsEditing(true)}
              >
                Unit {unit.weekNumber}: {unit.title}
                <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-white"
              onClick={() => onCreateLesson(unit.id)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Lesson
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-white text-slate-600 hover:bg-slate-50"
              onClick={() => setUnitDetailsOpen(true)}
              title="Edit unit details"
            >
              <Settings className="w-3.5 h-3.5 mr-1" />
              Details
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
              onClick={() => setQuizBuilderOpen(true)}
            >
              <ClipboardList className="w-3.5 h-3.5 mr-1" />
              Quiz
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{unit.title}"? All lessons within this unit
                    will also be deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteUnit(unit.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Unit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {expanded && (
          <CardContent className="p-4 pt-0 bg-white">
            {/* Unit meta preview */}
            {(unit.description || unit.duration) && (
              <div className="mt-3 mb-4 pl-8 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                {unit.description && (
                  <span className="truncate max-w-sm">{unit.description}</span>
                )}
                {unit.duration && (
                  <span className="shrink-0 font-medium text-slate-600">⏱ {unit.duration}</span>
                )}
              </div>
            )}

            <div className="mt-2 pl-8">
              <SortableContext
                items={sortedLessons.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedLessons.length > 0 ? (
                  sortedLessons.map((lesson) => (
                    <SortableLesson
                      key={lesson.id}
                      lesson={lesson}
                      courseId={courseId}
                      onUpdate={onUpdateLesson}
                      onDelete={onDeleteLesson}
                    />
                  ))
                ) : (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg bg-slate-50/50">
                    <p className="text-sm text-slate-400">No lessons in this unit yet.</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-purple-600 mt-1"
                      onClick={() => onCreateLesson(unit.id)}
                    >
                      Create your first lesson
                    </Button>
                  </div>
                )}
              </SortableContext>
            </div>
          </CardContent>
        )}
      </Card>

      <UnitDetailsSheet
        unit={unit}
        courseId={courseId}
        open={unitDetailsOpen}
        onClose={() => setUnitDetailsOpen(false)}
      />

      <AdminQuizBuilder
        unitId={unit.id}
        unitTitle={`Unit ${unit.weekNumber}: ${unit.title}`}
        open={quizBuilderOpen}
        onClose={() => setQuizBuilderOpen(false)}
      />
    </div>
  );
}
