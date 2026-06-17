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
  role: "admin" | "member";
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  workspace: string;
  owner: string;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
  color?: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  workspace: string;
  color?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
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
  role?: "admin" | "member"
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
  role: "admin" | "member"
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
