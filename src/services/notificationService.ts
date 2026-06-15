import type { User, Task } from '@/types';
import { useNotificationStore } from '@/store/notificationStore';
import { sendEmail } from './emailService';

function makeId() {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function notifyTaskAssigned(task: Task, projectTitle: string, assignee: User) {
  if (!assignee?.id || assignee.id === '0' || !assignee.email) return;
  const notif = {
    id: makeId(),
    type: 'task_assigned' as const,
    title: 'Task Assigned',
    message: `You have been assigned "${task.title}" in project "${projectTitle}".`,
    taskId: task.id,
    projectId: task.projectId,
    toUserId: assignee.id,
    read: false,
    createdAt: new Date().toISOString(),
  };
  useNotificationStore.getState().addNotification(notif);

  sendEmail({
    to_email: assignee.email,
    to_name: assignee.name,
    subject: `Assigned: ${task.title}`,
    message: notif.message,
  });
}

export function notifyTaskCompleted(task: Task, projectTitle: string, completedBy: User, adminUsers: User[]) {
  for (const admin of adminUsers) {
    if (!admin.id || admin.id === completedBy.id) continue;
    const notif = {
      id: makeId(),
      type: 'task_completed' as const,
      title: 'Task Completed',
      message: `"${task.title}" in "${projectTitle}" was completed by ${completedBy.name}.`,
      taskId: task.id,
      projectId: task.projectId,
      fromUserId: completedBy.id,
      toUserId: admin.id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    useNotificationStore.getState().addNotification(notif);

    if (admin.email) {
      sendEmail({
        to_email: admin.email,
        to_name: admin.name,
        subject: `Completed: ${task.title}`,
        message: notif.message,
      });
    }
  }
}

export function notifyTaskOverdue(task: Task, projectTitle: string, adminUsers: User[]) {
  const assigneeName = task.assignedUser?.name || 'Unassigned';
  for (const admin of adminUsers) {
    const notif = {
      id: makeId(),
      type: 'task_overdue' as const,
      title: 'Task Overdue',
      message: `"${task.title}" in "${projectTitle}" (assigned to ${assigneeName}) is overdue. Due date was ${task.dueDate}.`,
      taskId: task.id,
      projectId: task.projectId,
      toUserId: admin.id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    useNotificationStore.getState().addNotification(notif);

    if (admin.email) {
      sendEmail({
        to_email: admin.email,
        to_name: admin.name,
        subject: `Overdue: ${task.title}`,
        message: notif.message,
      });
    }
  }
}
