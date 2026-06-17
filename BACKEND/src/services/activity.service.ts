import ActivityModel from "../model/activity.model";

export interface CreateActivityData {
  workspace: string;
  project?: string;
  task?: string;
  user: string;
  action: string;
  details: string;
}

export const createActivityLog = async (data: CreateActivityData) => {
  try {
    const activity = await ActivityModel.create(data);
    return activity;
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
};

export const getWorkspaceActivitiesService = async (workspaceId: string) => {
  return await ActivityModel.find({ workspace: workspaceId })
    .populate("user", "username email")
    .populate("project", "name")
    .populate("task", "title")
    .sort({ createdAt: -1 })
    .limit(50);
};
