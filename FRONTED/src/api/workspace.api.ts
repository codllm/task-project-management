import api from "../api/user.api";

// Create Workspace
export const createWorkspace = async (data: any) => {
  const res = await api.post("/api/workspaces/create", data);
  return res.data;
};

// Get User Workspaces
export const getUserWorkspace = async (userId: string) => {
  const res = await api.get(`/api/workspaces/user/${userId}`);
  return res.data;
};

// Get Workspace By Id
export const getWorkspaceById = async (workspaceId: string) => {
  const res = await api.get(`/api/workspaces/${workspaceId}`);
  return res.data;
};

// Update Workspace
export const updateWorkspace = async (
  workspaceId: string,
  data: any
) => {
  const res = await api.put(
    `/api/workspaces/update/${workspaceId}`,
    data
  );
  return res.data;
};

// Add Member
export const addMemberToWorkspace = async (
  workspaceId: string,
  userId: string,
  role = "member"
) => {
  const res = await api.put(
    `/api/workspaces/${workspaceId}/add-member`,
    {
      userId,
      role,
    }
  );

  return res.data;
};

// Remove Member
export const removeMemberFromWorkspace = async (
  workspaceId: string,
  userId: string
) => {
  const res = await api.put(
    `/api/workspaces/${workspaceId}/remove-member`,
    {
      userId,
    }
  );

  return res.data;
};

// Change Role
export const changeMemberRole = async (
  workspaceId: string,
  userId: string,
  role: string
) => {
  const res = await api.put(
    `/api/workspaces/${workspaceId}/change-role`,
    {
      userId,
      role,
    }
  );

  return res.data;
};

// Leave Workspace
export const leaveWorkspace = async (
  workspaceId: string
) => {
  const res = await api.put(
    `/api/workspaces/${workspaceId}/leave`
  );

  return res.data;
};

// Delete Workspace
export const deleteWorkspace = async (
  workspaceId: string
) => {
  const res = await api.delete(
    `/api/workspaces/delete/${workspaceId}`
  );

  return res.data;
};