import { useState } from 'react';
import { Calendar, Users, MoreVertical, Edit, Trash2, CheckCircle2, Clock, AlertTriangle, ArrowRight, Archive, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Project } from '@/types';
import StatusBadge from './StatusBadge';
import { formatDate, cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';

interface ProjectCardProps {
  project: Project & { totalTasks?: number; doneTasks?: number; inProgressTasks?: number; overdueTasks?: number };
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onArchive?: (project: Project) => void;
  showArchived?: boolean;
  listMode?: boolean;
  isLast?: boolean;
}

export default function ProjectCard({ project, onEdit, onDelete, onArchive, showArchived, listMode, isLast }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const pct = project.completionPercentage ?? 0;
  const progressColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-400';

  if (listMode) {
    return (
      <div className={cn("flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors", !isLast && "border-b border-gray-100 dark:border-gray-800")}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/projects/${project.id}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
              {project.title}
            </Link>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{project.description}</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className={cn("h-1.5 rounded-full", progressColor)} style={{ width: `${pct}%` }} />
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{pct}%</span>
          </div>
          <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{project.totalTasks ?? 0}</div>
          <div className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{project.doneTasks ?? 0}</div>
          <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(project.dueDate)}</div>
          <div className="flex -space-x-1.5">
            {project.members?.slice(0, 3).map(m => <UserAvatar key={m.user.id} user={m.user} size="xs" />)}
            {(project.members?.length ?? 0) > 3 && (
              <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-500 dark:text-gray-400 border-2 border-white dark:border-gray-900">
                +{project.members!.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          {onEdit && (
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-1 z-20">
                {onEdit && !showArchived && <button onClick={() => { onEdit(project); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"><Edit className="w-3.5 h-3.5" /> Edit</button>}
                {onArchive && <button onClick={() => { onArchive(project); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">{showArchived ? <><RotateCcw className="w-3.5 h-3.5" /> Restore</> : <><Archive className="w-3.5 h-3.5" /> Archive</>}</button>}
                {onDelete && <button onClick={() => { onDelete(project); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link to={`/projects/${project.id}`} className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 group">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <StatusBadge status={project.status} />
          </div>
          {onEdit && (
            <div className="relative ml-2">
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100">
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-1 z-20">
                    {onEdit && !showArchived && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(project); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"><Edit className="w-3.5 h-3.5" /> Edit</button>}
                    {onArchive && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(project); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">{showArchived ? <><RotateCcw className="w-3.5 h-3.5" /> Restore</> : <><Archive className="w-3.5 h-3.5" /> Archive</>}</button>}
                    {onDelete && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(project); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{project.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">{project.description || 'No description'}</p>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500 dark:text-gray-400">Progress</span>
            <span className="font-semibold text-gray-900 dark:text-white">{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
            <div className={cn("h-2 rounded-full transition-all duration-500", progressColor)} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {(project.totalTasks !== undefined) && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{project.totalTasks}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tasks</p>
            </div>
            <div className="text-center py-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{project.doneTasks}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Done</p>
            </div>
            <div className="text-center py-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{project.inProgressTasks}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {project.dueDate ? formatDate(project.dueDate) : 'No deadline'}
          </div>
          {project.overdueTasks !== undefined && project.overdueTasks > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="w-3.5 h-3.5" />
              {project.overdueTasks} overdue
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {project.members?.slice(0, 4).map(m => <UserAvatar key={m.user.id} user={m.user} size="xs" />)}
          {(project.members?.length ?? 0) > 4 && (
            <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-500 dark:text-gray-400">
              +{project.members!.length - 4}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
