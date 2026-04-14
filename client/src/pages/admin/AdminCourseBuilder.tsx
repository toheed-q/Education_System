import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  Plus, 
  Settings, 
  Save, 
  Loader2, 
  LayoutGrid,
  History
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import { SortableUnit } from "@/components/admin/SortableUnit";

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

export default function AdminCourseBuilder() {
  const [, params] = useRoute("/admin/courses/:id/builder");
  const courseId = Number(params?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeType, setActiveType] = useState<"unit" | "lesson" | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Queries
  const { data: course, isLoading: courseLoading } = useQuery<{ title: string }>({
    queryKey: [`/api/courses/${courseId}`],
  });

  const { data: units = [], isLoading: unitsLoading } = useQuery<Unit[]>({
    queryKey: [`/api/courses/${courseId}/units`],
    select: (data) => [...data].sort((a, b) => a.weekNumber - b.weekNumber),
  });

  // Mutations
  const createUnitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/units", {
        courseId,
        title: "New Unit",
      });
      return response.json();
    },
    onSuccess: (newUnit) => {
      queryClient.refetchQueries({ queryKey: [`/api/courses/${courseId}/units`] });
      setExpandedUnits(prev => new Set(prev).add(newUnit.id));
      toast({ title: "Unit Created", description: "Successfully added new unit." });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      await apiRequest("PUT", `/api/units/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [`/api/courses/${courseId}/units`] });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/units/${id}`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [`/api/courses/${courseId}/units`] });
      toast({ title: "Unit Deleted" });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (unitId: number) => {
      const response = await apiRequest("POST", "/api/lessons", {
        weekId: unitId,
        title: "New Lesson",
        type: "reading",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [`/api/courses/${courseId}/units`] });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      await apiRequest("PUT", `/api/lessons/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [`/api/courses/${courseId}/units`] });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/lessons/${id}`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [`/api/courses/${courseId}/units`] });
      toast({ title: "Lesson Deleted" });
    },
  });

  // Reordering Mutations with Optimistic Updates
  const reorderUnitsMutation = useMutation({
    mutationFn: async (newOrders: { id: number; weekNumber: number }[]) => {
      await apiRequest("PATCH", "/api/units/reorder", {
        courseId,
        orders: newOrders,
      });
    },
    onMutate: async (newOrders) => {
      await queryClient.cancelQueries({ queryKey: [`/api/courses/${courseId}/units`] });
      const previousUnits = queryClient.getQueryData([`/api/courses/${courseId}/units`]);
      
      // Update local state optimistically
      queryClient.setQueryData([`/api/courses/${courseId}/units`], (old: Unit[]) => {
        const orderMap = new Map(newOrders.map(o => [o.id, o.weekNumber]));
        return old.map(u => ({
          ...u,
          weekNumber: orderMap.get(u.id) || u.weekNumber
        })).sort((a, b) => a.weekNumber - b.weekNumber);
      });

      return { previousUnits };
    },
    onError: (err, newOrders, context) => {
      queryClient.setQueryData([`/api/courses/${courseId}/units`], context?.previousUnits);
      toast({ 
        title: "Reorder Failed", 
        description: "Your changes couldn't be saved. Rolling back.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: [`/api/courses/${courseId}/units`] });
    },
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: async ({ weekId, orders }: { weekId: number; orders: { id: number; sequenceOrder: number }[] }) => {
      await apiRequest("PATCH", "/api/lessons/reorder", { weekId, orders });
    },
    onMutate: async ({ weekId, orders }) => {
      await queryClient.cancelQueries({ queryKey: [`/api/courses/${courseId}/units`] });
      const previousUnits = queryClient.getQueryData([`/api/courses/${courseId}/units`]);

      queryClient.setQueryData([`/api/courses/${courseId}/units`], (old: Unit[]) => {
        return old.map(u => {
          if (u.id !== weekId) return u;
          const orderMap = new Map(orders.map(o => [o.id, o.sequenceOrder]));
          return {
            ...u,
            lessons: u.lessons?.map(l => ({
              ...l,
              sequenceOrder: orderMap.get(l.id) || l.sequenceOrder
            })).sort((a, b) => a.sequenceOrder - b.sequenceOrder)
          };
        });
      });

      return { previousUnits };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData([`/api/courses/${courseId}/units`], context?.previousUnits);
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: [`/api/courses/${courseId}/units`] });
    },
  });

  // Handlers
  const handleToggleExpand = (id: number) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Check if we are dragging a unit or a lesson
    const activeId = Number(active.id);
    const overId = Number(over.id);

    // If both are units
    const activeUnit = units.find(u => u.id === activeId);
    const overUnit = units.find(u => u.id === overId);

    if (activeUnit && overUnit) {
      const oldIndex = units.findIndex(u => u.id === activeId);
      const newIndex = units.findIndex(u => u.id === overId);
      const newUnitsArray = arrayMove(units, oldIndex, newIndex);
      
      const orders = newUnitsArray.map((u, i) => ({
        id: u.id,
        weekNumber: i + 1
      }));
      
      reorderUnitsMutation.mutate(orders);
      return;
    }

    // If both are lessons within the same unit
    // We need to find which unit they belong to
    let targetUnitId: number | null = null;
    let oldLessons: Lesson[] = [];

    for (const unit of units) {
      if (unit.lessons?.some(l => l.id === activeId)) {
        targetUnitId = unit.id;
        oldLessons = unit.lessons || [];
        break;
      }
    }

    if (targetUnitId && oldLessons.some(l => l.id === overId)) {
      const oldIndex = oldLessons.findIndex(l => l.id === activeId);
      const newIndex = oldLessons.findIndex(l => l.id === overId);
      const newLessonsArray = arrayMove(oldLessons, oldIndex, newIndex);
      
      const orders = newLessonsArray.map((l, i) => ({
        id: l.id,
        sequenceOrder: i + 1
      }));

      reorderLessonsMutation.mutate({ weekId: targetUnitId, orders });
    }
  };

  if (courseLoading || unitsLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto mb-12">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLocation("/admin/courses")}
                className="bg-white border text-slate-500 hover:text-slate-900 shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{course?.title}</h1>
                <p className="text-slate-500 text-sm">Course Content Builder</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <Button variant="outline" size="sm" className="hidden sm:flex bg-white">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-100"
                onClick={() => createUnitMutation.mutate()}
                disabled={createUnitMutation.isPending}
              >
                {createUnitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add New Unit
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Units</p>
                <p className="text-lg font-bold text-slate-900">{units.length}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                <History className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Lessons</p>
                <p className="text-lg font-bold text-slate-900">
                  {units.reduce((acc, unit) => acc + (unit.lessons?.length || 0), 0)}
                </p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Auto-save</p>
                <p className="text-sm font-semibold text-green-600">Enabled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Builder Content */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
        >
          <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
            {units.length > 0 ? (
              <div className="space-y-2">
                {units.map((unit) => (
                  <SortableUnit
                    key={unit.id}
                    unit={unit}
                    courseId={courseId}
                    expanded={expandedUnits.has(unit.id)}
                    onToggleExpand={handleToggleExpand}
                    onUpdateUnit={(id, data) => updateUnitMutation.mutate({ id, title: data.title })}
                    onDeleteUnit={(id) => deleteUnitMutation.mutate(id)}
                    onCreateLesson={(unitId) => createLessonMutation.mutate(unitId)}
                    onUpdateLesson={(id, data) => updateLessonMutation.mutate({ id, title: data.title })}
                    onDeleteLesson={(id) => deleteLessonMutation.mutate(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white border-2 border-dashed rounded-2xl">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LayoutGrid className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Build your course curriculum</h3>
                <p className="text-slate-500 max-w-sm mx-auto mb-8">
                  Create units to organize your course into weeks or modules, then add lessons to each unit.
                </p>
                <Button 
                  onClick={() => createUnitMutation.mutate()}
                  className="bg-purple-600 hover:bg-purple-700 h-11 px-8"
                  disabled={createUnitMutation.isPending}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Unit
                </Button>
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>
    </DashboardLayout>
  );
}
