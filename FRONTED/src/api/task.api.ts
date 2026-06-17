import api from "./user.api";

export interface SubTask {
  _id?: string;
  title: string;
  isCompleted: boolean;
}

export interface Attachment {
  name: string;
  url: string;
  fileType: string;
  uploadedBy?: string;
  createdAt?: string;
}

export interface TimeLog {
  _id?: string;
  loggedBy: {
    _id: string;
    username: {
      firstname: string;
      lastname: string;
    };
    email: string;
  } | string;
  hours: number;
  description?: string;
  date: string;
  createdAt?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  startDate?: string;
  project: string;
  assignedTo?: {
    _id: string;
    username: {
      firstname: string;
      lastname: string;
    };
    email: string;
    profilePic?: string;
  }[] | string[];
  subtasks: SubTask[];
  attachments?: Attachment[];
  commentsCount?: number;
  dependencies: string[];
  labels?: string[];
  recurring?: {
    isRecurring: boolean;
    frequency: "daily" | "weekly" | "monthly" | "none";
    nextRun?: string;
  };
  isArchived?: boolean;
  estimatedHours?: number;
  actualHours?: number;
  timeLogs?: TimeLog[];
  isDeleted?: boolean;
  deletedAt?: string;
  customFields?: { name: string; value: any }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  project: string;
  priority: "low" | "medium" | "high";
  status?: string;
  dueDate?: string;
  startDate?: string;
  assignedTo?: string | string[];
  labels?: string[];
  dependencies?: string[];
  recurring?: {
    isRecurring: boolean;
    frequency: "daily" | "weekly" | "monthly" | "none";
  };
  estimatedHours?: number;
  customFields?: { name: string; value: any }[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  status?: string;
  dueDate?: string;
  startDate?: string;
  assignedTo?: string | string[];
  subtasks?: SubTask[];
  newAttachments?: Attachment[];
  isArchived?: boolean;
  labels?: string[];
  dependencies?: string[];
  recurring?: {
    isRecurring: boolean;
    frequency: "daily" | "weekly" | "monthly" | "none";
  };
  position?: number;
  estimatedHours?: number;
  customFields?: { name: string; value: any }[];
}

export const createTask = async (data: CreateTaskPayload): Promise<{ success: boolean; task: Task }> => {
  const res = await api.post("/api/tasks/create", data);
  return res.data;
};

export const getProjectTasks = async (projectId: string): Promise<{ success: boolean; tasks: Task[] }> => {
  const res = await api.get(`/api/tasks/project/${projectId}`);
  return res.data;
};

export const getTaskById = async (taskId: string): Promise<{ success: boolean; task: Task }> => {
  const res = await api.get(`/api/tasks/${taskId}`);
  return res.data;
};

export const updateTask = async (
  taskId: string,
  data: UpdateTaskPayload
): Promise<{ success: boolean; task: Task }> => {
  const res = await api.put(`/api/tasks/${taskId}`, data);
  return {
    success: res.data.success,
    task: res.data.task || res.data.updatedTask,
  };
};

export const deleteTask = async (taskId: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/api/tasks/${taskId}`);
  return res.data;
};

export const getArchivedProjectTasks = async (projectId: string): Promise<{ success: boolean; tasks: Task[] }> => {
  const res = await api.get(`/api/tasks/project/${projectId}/archived`);
  return res.data;
};

// Time log API
export const logTime = async (
  taskId: string,
  hours: number,
  description: string,
  date?: string
): Promise<{ success: boolean; task: Task }> => {
  const res = await api.post(`/api/tasks/${taskId}/time-log`, { hours, description, date });
  return res.data;
};

export const deleteTimeLog = async (taskId: string, logId: string): Promise<{ success: boolean; task: Task }> => {
  const res = await api.delete(`/api/tasks/${taskId}/time-log/${logId}`);
  return res.data;
};

// Bulk Actions API
export const bulkUpdateTasks = async (
  taskIds: string[],
  updates: any
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post("/api/tasks/bulk-update", { taskIds, updates });
  return res.data;
};

// Trash Bin API
export const getTrashTasks = async (projectId: string): Promise<{ success: boolean; tasks: Task[] }> => {
  const res = await api.get(`/api/tasks/trash/list/${projectId}`);
  return res.data;
};

export const restoreTask = async (taskId: string): Promise<{ success: boolean; task: Task }> => {
  const res = await api.put(`/api/tasks/${taskId}/restore`);
  return res.data;
};

export const deleteTaskPermanently = async (taskId: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/api/tasks/${taskId}/permanent`);
  return res.data;
};
