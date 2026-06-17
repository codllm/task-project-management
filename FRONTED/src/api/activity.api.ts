import api from "./user.api";

export interface Activity {
  _id: string;
  workspace: string;
  project?: {
    _id: string;
    name: string;
  };
  task?: {
    _id: string;
    title: string;
  };
  user: {
    _id: string;
    username: {
      firstname: string;
      lastname: string;
    };
    email: string;
  };
  action: string;
  details: string;
  createdAt: string;
}

export const getWorkspaceActivities = async (
  workspaceId: string
): Promise<{ success: boolean; activities: Activity[] }> => {
  const res = await api.get(`/api/activities/workspace/${workspaceId}`);
  return res.data;
};
