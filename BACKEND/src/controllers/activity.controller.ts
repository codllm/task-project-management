import { Request, Response } from "express";
import { getWorkspaceActivitiesService } from "../services/activity.service";

export const getWorkspaceActivitiesController = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const activities = await getWorkspaceActivitiesService(workspaceId as string);
    return res.status(200).json({
      success: true,
      activities,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
    });
  }
};
