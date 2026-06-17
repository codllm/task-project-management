import { Request, Response } from "express";
import MilestoneModel from "../model/milestone.model";
import TaskModel from "../model/task.model";

export const createMilestone = async (req: Request, res: Response) => {
  try {
    const { title, description, project, dueDate, status, tasks } = req.body;

    const milestone = await MilestoneModel.create({
      title,
      description,
      project,
      dueDate,
      status: status || "active",
      tasks: tasks || [],
    });

    if (tasks && tasks.length > 0) {
      await TaskModel.updateMany(
        { _id: { $in: tasks } },
        { $set: { milestone: milestone._id } }
      );
    }

    return res.status(201).json({
      success: true,
      milestone,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create milestone",
    });
  }
};

export const getProjectMilestones = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const milestones = await MilestoneModel.find({ project: projectId }).populate("tasks");
    return res.status(200).json({
      success: true,
      milestones,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch milestones",
    });
  }
};

export const updateMilestone = async (req: Request, res: Response) => {
  try {
    const { milestoneId } = req.params;
    const { title, description, dueDate, status, tasks } = req.body;

    const milestone = await MilestoneModel.findById(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found" });
    }

    if (title !== undefined) milestone.title = title;
    if (description !== undefined) milestone.description = description;
    if (dueDate !== undefined) milestone.dueDate = dueDate;
    if (status !== undefined) milestone.status = status;
    
    if (tasks !== undefined) {
      const oldTasks = milestone.tasks.map((id) => id.toString());
      const newTasks = tasks.map((id: string) => id.toString());
      const removedTasks = oldTasks.filter((id) => !newTasks.includes(id));

      if (removedTasks.length > 0) {
        await TaskModel.updateMany(
          { _id: { $in: removedTasks } },
          { $unset: { milestone: "" } }
        );
      }

      if (newTasks.length > 0) {
        await TaskModel.updateMany(
          { _id: { $in: newTasks } },
          { $set: { milestone: milestone._id } }
        );
      }

      milestone.tasks = tasks;
    }

    await milestone.save();

    const populatedMilestone = await MilestoneModel.findById(milestoneId).populate("tasks");

    return res.status(200).json({
      success: true,
      milestone: populatedMilestone,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update milestone",
    });
  }
};

export const deleteMilestone = async (req: Request, res: Response) => {
  try {
    const { milestoneId } = req.params;

    const milestone = await MilestoneModel.findById(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found" });
    }

    await TaskModel.updateMany(
      { milestone: milestoneId },
      { $unset: { milestone: "" } }
    );

    await MilestoneModel.findByIdAndDelete(milestoneId);

    return res.status(200).json({
      success: true,
      message: "Milestone deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete milestone",
    });
  }
};
