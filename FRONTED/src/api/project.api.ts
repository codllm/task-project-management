import api from "./user.api";

export interface ProjectMember {
  user: {
    _id: string;
    username: {
      firstname: string;
      lastname: string;
    };
    email: string;
    profilePic?: string;
  } | string;
  role: "admin" | "member" | "viewer";
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  workspace: string;
  owner: string;
  members: ProjectMember[];
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  columns?: { id: string; label: string; color: string }[];
  customFields?: { name: string; type: "text" | "number" | "date" | "boolean"; required: boolean }[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  workspace: string;
  color?: string;
  coverImageUrl?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  coverImageUrl?: string;
}

export const createProject = async (data: CreateProjectPayload): Promise<{ success: boolean; project: Project }> => {
  const res = await api.post("/api/projects/create", data);
  return res.data;
};

export const getProjectById = async (projectId: string): Promise<{ success: boolean; project: Project }> => {
  const res = await api.get(`/api/projects/${projectId}`);
  return res.data;
};

export const getWorkspaceProjects = async (workspaceId: string): Promise<{ success: boolean; projects: Project[] }> => {
  const res = await api.get(`/api/projects/workspace/${workspaceId}`);
  return res.data;
};

export const updateProject = async (
  projectId: string,
  data: UpdateProjectPayload
): Promise<{ success: boolean; project: Project }> => {
  const res = await api.put(`/api/projects/update/${projectId}`, data);
  return res.data;
};

export const deleteProject = async (projectId: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/api/projects/delete/${projectId}`);
  return res.data;
};

export const addMemberToProject = async (
  projectId: string,
  userId: string,
  role?: "admin" | "member" | "viewer"
): Promise<{ success: boolean; project: Project }> => {
  const res = await api.put(`/api/projects/${projectId}/add-member`, { userId, role: role || "member" });
  return res.data;
};

export const removeMemberFromProject = async (
  projectId: string,
  userId: string
): Promise<{ success: boolean; project: Project }> => {
  const res = await api.put(`/api/projects/${projectId}/remove-member`, { userId });
  return res.data;
};

export const changeProjectRole = async (
  projectId: string,
  userId: string,
  role: "admin" | "member" | "viewer"
): Promise<{ success: boolean; project: Project }> => {
  const res = await api.put(`/api/projects/${projectId}/change-role`, { userId, role });
  return res.data;
};

export const getProjectMembers = async (
  projectId: string
): Promise<{ success: boolean; members: any[] }> => {
  const res = await api.get(`/api/projects/members/${projectId}`);
  return res.data;
};

// Workspace Analytics API
export const getWorkspaceAnalytics = async (
  workspaceId: string
): Promise<{ success: boolean; analytics: any }> => {
  const res = await api.get(`/api/analytics/workspace/${workspaceId}`);
  return res.data;
};

// Milestones API
export interface Milestone {
  _id: string;
  title: string;
  description?: string;
  project: string;
  dueDate?: string;
  status: "active" | "completed";
  tasks: string[] | any[];
  createdAt: string;
  updatedAt: string;
}

export const createMilestone = async (data: {
  title: string;
  description?: string;
  project: string;
  dueDate?: string;
  status?: "active" | "completed";
  tasks?: string[];
}): Promise<{ success: boolean; milestone: Milestone }> => {
  const res = await api.post("/api/milestones", data);
  return res.data;
};

export const getProjectMilestones = async (
  projectId: string
): Promise<{ success: boolean; milestones: Milestone[] }> => {
  const res = await api.get(`/api/milestones/project/${projectId}`);
  return res.data;
};

export const updateMilestone = async (
  milestoneId: string,
  data: {
    title?: string;
    description?: string;
    dueDate?: string;
    status?: "active" | "completed";
    tasks?: string[];
  }
): Promise<{ success: boolean; milestone: Milestone }> => {
  const res = await api.put(`/api/milestones/${milestoneId}`, data);
  return res.data;
};

export const deleteMilestone = async (
  milestoneId: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/api/milestones/${milestoneId}`);
  return res.data;
};

// Trash Bin API
export const getTrashProjects = async (workspaceId: string): Promise<{ success: boolean; projects: Project[] }> => {
  const res = await api.get(`/api/projects/trash/workspace/${workspaceId}`);
  return res.data;
};

export const restoreProject = async (projectId: string): Promise<{ success: boolean; project: Project }> => {
  const res = await api.put(`/api/projects/restore/${projectId}`);
  return res.data;
};

export const deleteProjectPermanently = async (projectId: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/api/projects/permanent/${projectId}`);
  return res.data;
};

export const updateProjectColumnsApi = async (
  projectId: string,
  columns: any[]
): Promise<{ success: boolean; project: Project }> => {
  const res = await api.put(`/api/projects/${projectId}/columns`, { columns });
  return res.data;
};

export const updateProjectCustomFieldsApi = async (
  projectId: string,
  customFields: any[]
): Promise<{ success: boolean; project: Project }> => {
  const res = await api.put(`/api/projects/${projectId}/custom-fields`, { customFields });
  return res.data;
};
