import api from "./user.api";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WorkspaceMember {
  user: {
    _id: string;
    username: {
      firstname: string;
      lastname: string;
    };
    email: string;
    profilePic?: string;
  } | string;
  role: "owner" | "admin" | "member";
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner: string; // user ID
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  description?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Create a new workspace
 * POST /api/workspaces/create
 */
export const createWorkspace = async (
  data: CreateWorkspacePayload
): Promise<{ success: boolean; workspace: Workspace }> => {
  const res = await api.post("/api/workspaces/create", data);
  return res.data;
};

/**
 * Get all workspaces belonging to/including a user
 * GET /api/workspaces/user/:userId
 */
export const getUserWorkspace = async (
  userId: string
): Promise<{ success: boolean; workspaces: Workspace[] }> => {
  const res = await api.get(`/api/workspaces/user/${userId}`);
  return res.data;
};

/**
 * Get a specific workspace's details by ID
 * GET /api/workspaces/:workspaceId
 */
export const getWorkspaceById = async (
  workspaceId: string
): Promise<{ success: boolean; workspace: Workspace }> => {
  const res = await api.get(`/api/workspaces/${workspaceId}`);
  return res.data;
};

/**
 * Update workspace info (name, description)
 * PUT /api/workspaces/update/:workspaceId
 */
export const updateWorkspace = async (
  workspaceId: string,
  data: UpdateWorkspacePayload
): Promise<{ success: boolean; workspace: Workspace }> => {
  const res = await api.put(`/api/workspaces/update/${workspaceId}`, data);
  return res.data;
};

/**
 * Add a user/member to the workspace
 * PUT /api/workspaces/:workspaceId/add-member
 */
export const addMemberToWorkspace = async (
  workspaceId: string,
  userId: string,
  role?: "owner" | "admin" | "member"
): Promise<{ success: boolean; workspace: Workspace }> => {
  const res = await api.put(`/api/workspaces/${workspaceId}/add-member`, {
    userId,
    role: role || "member",
  });
  return res.data;
};

/**
 * Remove a user/member from the workspace
 * PUT /api/workspaces/:workspaceId/remove-member
 */
export const removeMemberFromWorkspace = async (
  workspaceId: string,
  userId: string
): Promise<{ success: boolean; workspace: Workspace }> => {
  const res = await api.put(`/api/workspaces/${workspaceId}/remove-member`, {
    userId,
  });
  return res.data;
};

/**
 * Change member role (e.g. from member to admin, or vice versa)
 * PUT /api/workspaces/:workspaceId/change-role
 */
export const changeMemberRole = async (
  workspaceId: string,
  userId: string,
  role: "admin" | "member"
): Promise<{ success: boolean; workspace: Workspace }> => {
  const res = await api.put(`/api/workspaces/${workspaceId}/change-role`, {
    userId,
    role,
  });
  return res.data;
};

/**
 * Leave workspace
 * PUT /api/workspaces/:workspaceId/leave
 */
export const leaveWorkspace = async (
  workspaceId: string
): Promise<{ success: boolean; workspace: Workspace }> => {
  const res = await api.put(`/api/workspaces/${workspaceId}/leave`);
  return res.data;
};

/**
 * Delete a workspace (admin/owner only)
 * DELETE /api/workspaces/delete/:workspaceId
 */
export const deleteWorkspace = async (
  workspaceId: string
): Promise<{ success: boolean; result: any }> => {
  const res = await api.delete(`/api/workspaces/delete/${workspaceId}`);
  return res.data;
};