export type UserRole = 'admin' | 'user' | 'guest';
export type ProjectRole = 'member' | 'lead';

export interface ProjectMember {
  user: User;
  projectRole: ProjectRole;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  department?: string;
  title?: string;
  timezone?: string;
}

export type ProjectStatus = 'active' | 'completed' | 'on-hold' | 'archived';
export type ProjectColor = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'yellow' | 'pink' | 'gray';

export interface Project {
  id: string;
  title: string;
  description: string;
  members: ProjectMember[];
  status: ProjectStatus;
  completionPercentage: number;
  dueDate: string;
  startDate?: string;
  color: ProjectColor;
  icon?: string;
  ownerId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  milestones?: Milestone[];
}

export const Priority = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const TaskStatus = {
  Todo: 'Todo',
  InProgress: 'InProgress',
  Done: 'Done',
  Blocked: 'Blocked',
  Cancelled: 'Cancelled',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  assignee?: User;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'link' | 'file';
  size?: number;
  uploadedBy: User;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  content: string;
  author: User;
  mentions?: User[];
  createdAt: string;
  updatedAt: string;
  reactions?: Reaction[];
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  startDate?: string;
  assignedUser: User;
  followers?: User[];
  tags?: string[];
  subtasks?: Subtask[];
  attachments?: Attachment[];
  comments?: Comment[];
  dependencies?: string[]; // Task IDs this task depends on
  dependentTasks?: string[]; // Task IDs that depend on this task
  estimatedHours?: number;
  actualHours?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'not-started' | 'in-progress' | 'completed';
  taskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkloadEntry {
  userId: string;
  user: User;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  estimatedHours: number;
  actualHours: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    type: 'status-change' | 'due-date' | 'assignment' | 'comment';
    conditions: Record<string, any>;
  };
  actions: {
    type: 'update-status' | 'send-notification' | 'assign-user' | 'add-tag';
    parameters: Record<string, any>;
  }[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface FilterState {
  search: string;
  status: TaskStatus | '';
  priority: Priority | '';
  dateRange: DateRange;
  assignee?: string;
  tags?: string[];
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'task' | 'project' | 'comment' | 'mention' | 'system';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  read: boolean;
  userId: string;
  taskId?: string;
  projectId?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ViewMode {
  type: 'list' | 'board' | 'timeline' | 'calendar';
  groupBy?: 'status' | 'priority' | 'assignee' | 'due-date' | 'project';
  sortBy?: 'due-date' | 'priority' | 'created' | 'updated';
}

export interface ChatMessage {
  id: string;
  channelId: string;
  parentId?: string;
  replyToId?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  attachments?: ChatAttachment[];
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  isStarred?: boolean;
  forwardedFrom?: string;
  auto_delete_at?: string | null;
  createdAt: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  isVoice?: boolean;
  duration?: number;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  emoji: string;
  userId: string;
  userName: string;
}

export interface ChannelInfo {
  id: string;
  name: string;
  type: string;
  workspaceId: string;
  description?: string;
  topic?: string;
  icon?: string;
  avatar?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  pinned?: boolean;
  auto_delete?: string | null;
}
