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

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  project: string;
  priority: "low" | "medium" | "high";
  status?: "todo" | "in-progress" | "completed";
  dueDate?: string;
  assignedTo?: string | string[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  status?: "todo" | "in-progress" | "completed";
  dueDate?: string;
  assignedTo?: string | string[];
  subtasks?: SubTask[];
  newAttachments?: Attachment[];
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
