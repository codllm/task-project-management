
import { Request, Response } from "express";
import mongoose from "mongoose";
import TaskModel from "../model/task.model";

export const getProjectAnalyticsController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId =
      typeof req.params.projectId === "string"
        ? req.params.projectId
        : "";

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Project ID",
      });
    }

    const analytics = await TaskModel.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const result: {
      todo: number;
      "in-progress": number;
      completed: number;
    } = {
      todo: 0,
      "in-progress": 0,
      completed: 0,
    };

    analytics.forEach((item: { _id: string; count: number }) => {
      if (
        item._id === "todo" ||
        item._id === "in-progress" ||
        item._id === "completed"
      ) {
        result[item._id] = item.count;
      }
    });

    res.status(200).json({
      success: true,
      analytics: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
