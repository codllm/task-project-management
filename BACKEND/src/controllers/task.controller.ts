import { Request, Response } from "express";

import {
  createTaskService,
  getProjectTasksService,
  getSingleTaskService,
  updateTaskService,
  deleteTaskService,
  getArchivedProjectTasksService,
  logTimeService,
  deleteTimeLogService,
  bulkUpdateTasksService,
  getTrashTasksService,
  restoreTaskService,
  deleteTaskPermanentlyService,
} from "../services/task.service";

export const createTaskController = async (
  req: Request,
  res: Response
) => {
  try {

    const userId = (req as any).user._id;

    const task = await createTaskService({
      ...req.body,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      task,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
    });

  }
};

export const getProjectTasksController = async (
  req: Request,
  res: Response
) => {
  try {

    const projectId = req.params.projectId as string;
    const userId = (req as any).user._id;

    const tasks = await getProjectTasksService(
      projectId,
      userId
    );

    return res.status(200).json({
      success: true,
      tasks,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });

  }
};

export const getArchivedProjectTasksController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = (req as any).user._id;

    const tasks = await getArchivedProjectTasksService(
      projectId,
      userId
    );

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch archived tasks",
    });
  }
};

export const getSingleTaskController = async (
  req: Request,
  res: Response
) => {
  try {

    const taskId = req.params.taskId as string;
    const userId = (req as any).user._id;

    const task = await getSingleTaskService(taskId, userId);

    return res.status(200).json({
      success: true,
      task,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task",
    });

  }
};

export const updateTaskController = async (
  req: Request,
  res: Response
) => {
  try {

    const { taskId } = req.params;
    const userId = (req as any).user._id;

    const updatedTask = await updateTaskService(
      taskId as string,
      req.body,
      userId
    );

    return res.status(200).json({
      success: true,
      updatedTask,
      task: updatedTask,
    });

  } catch (error: any) {

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update task",
    });

  }
};

export const deleteTaskController = async (
  req: Request,
  res: Response
) => {
  try {

    const  taskId  = req.params.taskId as string;
    const userId = (req as any).user._id;

    await deleteTaskService(taskId, userId);

    return res.status(200).json({
      success: true,
      message: "Task deleted",
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });

  }
};

export const logTimeController = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const userId = (req as any).user._id;
    const { hours, description, date } = req.body;

    if (!hours || isNaN(Number(hours))) {
      return res.status(400).json({ success: false, message: "Valid hours are required" });
    }

    const task = await logTimeService(taskId, userId, Number(hours), description, date);
    return res.status(200).json({ success: true, task });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to log time" });
  }
};

export const deleteTimeLogController = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const logId = req.params.logId as string;
    const task = await deleteTimeLogService(taskId, logId);
    return res.status(200).json({ success: true, task });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete time log" });
  }
};

export const bulkUpdateController = async (req: Request, res: Response) => {
  try {
    const { taskIds, updates } = req.body;
    const userId = (req as any).user._id;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: "taskIds array is required" });
    }

    await bulkUpdateTasksService(taskIds, updates, userId);
    return res.status(200).json({ success: true, message: "Tasks updated successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to bulk update tasks" });
  }
};

export const getTrashTasksController = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = (req as any).user._id;
    const tasks = await getTrashTasksService(projectId, userId);
    return res.status(200).json({ success: true, tasks });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch trash tasks" });
  }
};

export const restoreTaskController = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const userId = (req as any).user._id;
    const task = await restoreTaskService(taskId, userId);
    return res.status(200).json({ success: true, task });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to restore task" });
  }
};

export const deleteTaskPermanentlyController = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const userId = (req as any).user._id;
    await deleteTaskPermanentlyService(taskId, userId);
    return res.status(200).json({ success: true, message: "Task permanently deleted" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to permanently delete task" });
  }
};