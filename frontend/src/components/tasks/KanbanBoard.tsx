import { useState } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import type { Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface Props { tasks: Task[]; onStatusChange: (taskId: string, newStatus: Task['status']) => void; onEdit?: (task: Task) => void; onDelete?: (task: Task) => void; }

function KanbanColumn({ id, title, dotColor, tasks, onEdit, onDelete, onStatusChange }: { id: TaskStatus; title: string; dotColor: string; tasks: Task[]; onEdit?: (task: Task) => void; onDelete?: (task: Task) => void; onStatusChange: (taskId: string, newStatus: Task['status']) => void; }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn('bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-800 transition-colors', isOver && 'border-primary-400 dark:border-primary-500')}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full', dotColor)} />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">{tasks.length}</span>
      </div>
      <div className="space-y-2 min-h-[100px]">
        {tasks.map((task) => <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} isDraggable />)}
        {tasks.length === 0 && <div className="flex items-center justify-center h-20 text-xs text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">Drop tasks here</div>}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks, onStatusChange, onEdit, onDelete }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const columns = [
    { id: 'Todo' as TaskStatus, title: 'To Do', dotColor: 'bg-gray-400' },
    { id: 'InProgress' as TaskStatus, title: 'In Progress', dotColor: 'bg-blue-500' },
    { id: 'Done' as TaskStatus, title: 'Done', dotColor: 'bg-emerald-500' },
    { id: 'Blocked' as TaskStatus, title: 'Blocked', dotColor: 'bg-red-500' },
    { id: 'Cancelled' as TaskStatus, title: 'Cancelled', dotColor: 'bg-gray-500' },
  ];

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = active.id as string;
    const overId = over.id as string;
    if (taskId === overId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task) { const ns = overId as Task['status']; if (task.status !== ns) onStatusChange(taskId, ns); }
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {columns.map((col) => <KanbanColumn key={col.id} id={col.id} title={col.title} dotColor={col.dotColor} tasks={tasks.filter((t) => t.status === col.id)} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />)}
      </div>
      <DragOverlay>
        {activeTask ? <div className="rotate-2 opacity-90 shadow-lg"><TaskCard task={activeTask} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} isDraggable /></div> : null}
      </DragOverlay>
    </DndContext>
  );
}
