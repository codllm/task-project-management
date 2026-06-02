import { Request, Response } from "express";

import {
  createTaskService,
  getProjectTasksService,
  getSingleTaskService,
  updateTaskService,
  deleteTaskService,
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

    const  projectId  = req.params.projectId as string;

    const tasks = await getProjectTasksService(
      projectId
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

export const getSingleTaskController = async (
  req: Request,
  res: Response
) => {
  try {

    const  taskId  = req.params.taskId as string;

    const task = await getSingleTaskService(taskId);

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

    const updatedTask = await updateTaskService(
      taskId as string,
      req.body
    );

    return res.status(200).json({
      success: true,
      updatedTask,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to update task",
    });

  }
};

export const deleteTaskController = async (
  req: Request,
  res: Response
) => {
  try {

    const  taskId  = req.params.taskId as string;

    await deleteTaskService(taskId);

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