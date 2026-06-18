import { useState } from 'react';
import { Plus, Calendar, CheckCircle, Clock, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import type { Milestone } from '@/types';
import { cn } from '@/lib/utils';

interface MilestonesListProps {
  milestones: Milestone[];
  onAddMilestone: (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateMilestone: (id: string, milestone: Partial<Milestone>) => void;
  onDeleteMilestone: (id: string) => void;
}

export default function MilestonesList({
  milestones,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
}: MilestonesListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', dueDate: '' });

  const handleAdd = () => {
    if (newMilestone.title.trim()) {
      onAddMilestone({
        ...newMilestone,
        projectId: '',
        status: 'not-started',
        taskIds: [],
      });
      setNewMilestone({ title: '', description: '', dueDate: '' });
      setIsAdding(false);
    }
  };

  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'not-started': return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Milestone['status']) => {
    switch (status) {
      case 'completed': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'in-progress': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'not-started': return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const isOverdue = (dueDate: string, status: Milestone['status']) => {
    return status !== 'completed' && new Date(dueDate) < new Date();
  };

  const getProgress = (milestone: Milestone) => {
    if (milestone.taskIds.length === 0) return 0;
    // This would need to be calculated from actual task data
    // For now, return a mock value based on status
    switch (milestone.status) {
      case 'completed': return 100;
      case 'in-progress': return 50;
      case 'not-started': return 0;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Milestones</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
        >
          <Plus className="w-3 h-3" />
          Add Milestone
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
          <input
            type="text"
            value={newMilestone.title}
            onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
            placeholder="Milestone title"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <textarea
            value={newMilestone.description}
            onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <input
            type="date"
            value={newMilestone.dueDate}
            onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewMilestone({ title: '', description: '', dueDate: '' });
              }}
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {milestones.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No milestones yet
          </p>
        ) : (
          milestones.map((milestone) => {
            const progress = getProgress(milestone);
            return (
              <div
                key={milestone.id}
                className={cn(
                  'border-l-4 rounded-lg p-4 transition-colors',
                  getStatusColor(milestone.status),
                  isOverdue(milestone.dueDate, milestone.status) && 'border-l-red-500'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(milestone.status)}
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">
                      {milestone.title}
                    </h4>
                    {isOverdue(milestone.dueDate, milestone.status) && (
                      <span className="px-2 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        Overdue
                      </span>
                    )}
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {milestone.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {milestone.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(milestone.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{milestone.taskIds.length} tasks</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        milestone.status === 'completed' ? 'bg-green-600 dark:bg-green-400' : 'bg-purple-600 dark:bg-purple-400'
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">
                    {progress}%
                  </span>
                </div>

                {/* Status actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <select
                    value={milestone.status}
                    onChange={(e) => onUpdateMilestone(milestone.id, { status: e.target.value as Milestone['status'] })}
                    className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    onClick={() => onDeleteMilestone(milestone.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
