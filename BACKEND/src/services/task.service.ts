import mongoose from "mongoose";
import TaskModel from "../model/task.model";
import ProjectModel from "../model/project.model";
import CommentModel from "../model/comment.model";
import { createNotification } from "./notification.service";
import { emitToProject } from "./socket";
import { createActivityLog } from "./activity.service";
import { calculateNextRun } from "./scheduler";
import { parseAndNotifyMentions } from "./mention.service";

export const createTaskService = async (data: any) => {
  const status = data.status || "todo";
  const count = await TaskModel.countDocuments({ project: data.project, status });
  
  if (data.recurring && data.recurring.isRecurring && !data.recurring.nextRun) {
    data.recurring.nextRun = calculateNextRun(data.recurring.frequency);
  }

  const task = await TaskModel.create({ ...data, position: count });
  const populatedTask = await TaskModel.findById(task._id)
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email");

  if (!populatedTask) {
    throw new Error("Failed to populate created task");
  }

  emitToProject(populatedTask.project.toString(), "task:created", populatedTask);

  const project = await ProjectModel.findById(populatedTask.project);
  if (project) {
    await createActivityLog({
      workspace: project.workspace.toString(),
      project: project._id.toString(),
      task: populatedTask._id.toString(),
      user: populatedTask.createdBy._id.toString(),
      action: "task_created",
      details: `created task "${populatedTask.title}"`,
    });
  }

  if (populatedTask.assignedTo && Array.isArray(populatedTask.assignedTo)) {
    for (const assignee of populatedTask.assignedTo) {
      const assigneeId = (assignee as any)._id.toString();
      if (assigneeId !== populatedTask.createdBy._id.toString()) {
        await createNotification({
          recipient: assigneeId,
          sender: populatedTask.createdBy._id.toString(),
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          message: `You have been assigned to the task: "${populatedTask.title}"`,
          link: `/projects/${populatedTask.project}/tasks/${populatedTask._id}`,
        });
      }
    }
  }

  if (populatedTask.description) {
    await parseAndNotifyMentions(
      populatedTask.description,
      populatedTask.createdBy._id.toString(),
      populatedTask,
      false
    );
  }

  return {
    ...populatedTask.toObject(),
    commentsCount: 0,
  };
};

export const getProjectTasksService = async (
  projectId: string,
  userId: string
) => {
  const project = await ProjectModel.findById(projectId);
  const isProjectAdmin = project && (
    project.createdBy.toString() === userId.toString() ||
    project.members.some(m => m.user.toString() === userId.toString() && m.role === "admin")
  );

  let query: any = { project: projectId, isArchived: { $ne: true }, isDeleted: { $ne: true } };

  if (!isProjectAdmin) {
    query.$or = [
      { assignedTo: { $exists: false } },
      { assignedTo: null },
      { assignedTo: { $size: 0 } },
      { assignedTo: userId },
      { createdBy: userId }
    ];
  }

  const tasks = await TaskModel.find(query)
    .sort({ position: 1 })
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email");

  const tasksWithComments = await Promise.all(
    tasks.map(async (task) => {
      const commentsCount = await CommentModel.countDocuments({ task: task._id });
      return {
        ...task.toObject(),
        commentsCount,
      };
    })
  );

  return tasksWithComments;
};

export const getSingleTaskService = async (
  taskId: string,
  userId: string
) => {
  const task = await TaskModel.findById(taskId)
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email");

  if (!task || task.isDeleted) {
    return null;
  }

  const project = await ProjectModel.findById(task.project);
  const isProjectAdmin = project && (
    project.createdBy.toString() === userId.toString() ||
    project.members.some(m => m.user.toString() === userId.toString() && m.role === "admin")
  );

  const assigneesList = task.assignedTo ? (task.assignedTo as any[]).map(a => a._id.toString()) : [];
  const isAssigned = assigneesList.includes(userId.toString());
  const isCreator = task.createdBy._id.toString() === userId.toString();
  const isUnassigned = assigneesList.length === 0;

  if (!isProjectAdmin && !isAssigned && !isCreator && !isUnassigned) {
    throw new Error("Unauthorized to access this task");
  }

  const commentsCount = await CommentModel.countDocuments({ task: task._id });
  return {
    ...task.toObject(),
    commentsCount,
  };
};

export const updateTaskService = async (taskId: string, data: any, updaterId?: string) => {
  const originalTask = await TaskModel.findById(taskId);
  if (!originalTask) {
    throw new Error("Task not found");
  }

  const { newAttachments, ...updateData } = data;

  if (updateData.recurring && updateData.recurring.isRecurring && !updateData.recurring.nextRun) {
    updateData.recurring.nextRun = calculateNextRun(updateData.recurring.frequency);
  }

  // Check for task dependency blocks
  if (updateData.status === "completed") {
    const checkDeps = updateData.dependencies || originalTask.dependencies;
    if (checkDeps && checkDeps.length > 0) {
      const incompleteDeps = await TaskModel.find({
        _id: { $in: checkDeps },
        status: { $ne: "completed" },
        isArchived: { $ne: true },
      });
      if (incompleteDeps.length > 0) {
        const depTitles = incompleteDeps.map(d => `"${d.title}"`).join(", ");
        throw new Error(`Cannot complete task. It is blocked by incomplete dependencies: ${depTitles}`);
      }
    }
  }

  // Handle status/position reordering
  if (updateData.status !== undefined || updateData.position !== undefined) {
    const sourceStatus = originalTask.status;
    const targetStatus = updateData.status !== undefined ? updateData.status : sourceStatus;
    const originalPos = originalTask.position;
    
    // Determine target position
    let targetPos = updateData.position !== undefined ? updateData.position : 0;
    if (updateData.position === undefined) {
      if (sourceStatus !== targetStatus) {
        targetPos = await TaskModel.countDocuments({ project: originalTask.project, status: targetStatus });
      } else {
        targetPos = originalPos;
      }
    }

    if (sourceStatus !== targetStatus) {
      // Shift tasks in source column down
      await TaskModel.updateMany(
        { project: originalTask.project, status: sourceStatus, position: { $gt: originalPos } },
        { $inc: { position: -1 } }
      );
      
      // Shift tasks in target column up
      await TaskModel.updateMany(
        { project: originalTask.project, status: targetStatus, position: { $gte: targetPos } },
        { $inc: { position: 1 } }
      );
    } else if (originalPos !== targetPos) {
      // Reordering within the same column
      if (targetPos > originalPos) {
        await TaskModel.updateMany(
          {
            project: originalTask.project,
            status: sourceStatus,
            position: { $gt: originalPos, $lte: targetPos },
          },
          { $inc: { position: -1 } }
        );
      } else {
        await TaskModel.updateMany(
          {
            project: originalTask.project,
            status: sourceStatus,
            position: { $gte: targetPos, $lt: originalPos },
          },
          { $inc: { position: 1 } }
        );
      }
    }
    
    updateData.position = targetPos;
  }

  let updateQuery: any = { $set: updateData };
  if (newAttachments && newAttachments.length > 0) {
    updateQuery.$push = { attachments: { $each: newAttachments } };
  }

  const updatedTask = await TaskModel.findByIdAndUpdate(taskId, updateQuery, { new: true })
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email");

  if (!updatedTask) {
    throw new Error("Task not found");
  }

  emitToProject(updatedTask.project.toString(), "task:updated", updatedTask);

  const project = await ProjectModel.findById(updatedTask.project);
  if (project && updaterId) {
    let action = "task_updated";
    let details = `updated task "${updatedTask.title}"`;
    if (data.status !== undefined && originalTask.status !== data.status) {
      action = "task_status_changed";
      details = `moved task "${updatedTask.title}" from "${originalTask.status}" to "${data.status}"`;
    }
    
    await createActivityLog({
      workspace: project.workspace.toString(),
      project: project._id.toString(),
      task: updatedTask._id.toString(),
      user: updaterId,
      action,
      details,
    });
  }

  // Notify newly added assignees
  if (data.assignedTo && Array.isArray(data.assignedTo)) {
    const originalAssignees = originalTask.assignedTo ? (originalTask.assignedTo as any[]).map(id => id.toString()) : [];
    const newAssignees = data.assignedTo.map((id: any) => id.toString());

    const addedAssignees = newAssignees.filter((id: string) => !originalAssignees.includes(id));
    for (const assigneeId of addedAssignees) {
      if (assigneeId !== updaterId) {
        await createNotification({
          recipient: assigneeId,
          sender: updaterId || updatedTask.createdBy._id.toString(),
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          message: `You have been assigned to the task: "${updatedTask.title}"`,
          link: `/projects/${updatedTask.project}/tasks/${updatedTask._id}`,
        });
      }
    }
  }

  // Notify other task members about general task updates or attachments
  const assigneesList = updatedTask.assignedTo ? (updatedTask.assignedTo as any[]).map(a => a._id.toString()) : [];
  
  if (newAttachments && newAttachments.length > 0) {
    const title = "New Attachment on Task";
    const message = `${newAttachments.length} new file(s) uploaded to task "${updatedTask.title}"`;
    const link = `/projects/${updatedTask.project}/tasks/${updatedTask._id}`;

    for (const assigneeId of assigneesList) {
      if (assigneeId !== updaterId) {
        await createNotification({
          recipient: assigneeId,
          sender: updaterId || updatedTask.createdBy._id.toString(),
          type: "TASK_UPDATED",
          title,
          message,
          link,
        });
      }
    }

    if (
      updatedTask.createdBy &&
      updatedTask.createdBy._id.toString() !== updaterId &&
      !assigneesList.includes(updatedTask.createdBy._id.toString())
    ) {
      await createNotification({
        recipient: updatedTask.createdBy._id.toString(),
        sender: updaterId || updatedTask.createdBy._id.toString(),
        type: "TASK_UPDATED",
        title,
        message,
        link,
      });
    }
  } else if (updaterId) {
    for (const assigneeId of assigneesList) {
      if (assigneeId !== updaterId) {
        await createNotification({
          recipient: assigneeId,
          sender: updaterId,
          type: "TASK_UPDATED",
          title: "Task Updated",
          message: `The task: "${updatedTask.title}" assigned to you was updated`,
          link: `/projects/${updatedTask.project}/tasks/${updatedTask._id}`,
        });
      }
    }
  }

  if (data.description !== undefined && data.description !== originalTask.description) {
    await parseAndNotifyMentions(
      data.description,
      updaterId || updatedTask.createdBy._id.toString(),
      updatedTask,
      false
    );
  }

  const commentsCount = await CommentModel.countDocuments({ task: updatedTask._id });
  return {
    ...updatedTask.toObject(),
    commentsCount,
  };
};

export const deleteTaskService = async (
  taskId: string,
  userId?: string
) => {
  const task = await TaskModel.findById(taskId);
  if (task) {
    // Shift subsequent tasks in the same status down
    await TaskModel.updateMany(
      { project: task.project, status: task.status, position: { $gt: task.position } },
      { $inc: { position: -1 } }
    );
    
    const project = await ProjectModel.findById(task.project);
    if (project && userId) {
      await createActivityLog({
        workspace: project.workspace.toString(),
        project: project._id.toString(),
        task: task._id.toString(),
        user: userId,
        action: "task_deleted",
        details: `deleted task "${task.title}"`,
      });
    }

    task.isDeleted = true;
    task.deletedAt = new Date();
    await task.save();
    emitToProject(task.project.toString(), "task:deleted", { taskId });
  }

  return task;
};

export const getArchivedProjectTasksService = async (
  projectId: string,
  userId: string
) => {
  const project = await ProjectModel.findById(projectId);
  const isProjectAdmin = project && (
    project.createdBy.toString() === userId.toString() ||
    project.members.some(m => m.user.toString() === userId.toString() && m.role === "admin")
  );

  let query: any = { project: projectId, isArchived: true, isDeleted: { $ne: true } };

  if (!isProjectAdmin) {
    query.$or = [
      { assignedTo: { $exists: false } },
      { assignedTo: null },
      { assignedTo: { $size: 0 } },
      { assignedTo: userId },
      { createdBy: userId }
    ];
  }

  return await TaskModel.find(query)
    .sort({ updatedAt: -1 })
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email");
};

export const logTimeService = async (
  taskId: string,
  userId: string,
  hours: number,
  description: string,
  date?: string
) => {
  const task = await TaskModel.findById(taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  const logDate = date ? new Date(date) : new Date();
  
  task.timeLogs.push({
    loggedBy: new mongoose.Types.ObjectId(userId) as any,
    hours,
    description,
    date: logDate,
    createdAt: new Date()
  });

  task.actualHours = task.timeLogs.reduce((sum, log) => sum + log.hours, 0);
  await task.save();

  const populatedTask = await TaskModel.findById(taskId)
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email")
    .populate("timeLogs.loggedBy", "username email");

  if (populatedTask) {
    emitToProject(populatedTask.project.toString(), "task:updated", populatedTask);
  }

  return populatedTask;
};

export const deleteTimeLogService = async (
  taskId: string,
  logId: string
) => {
  const task = await TaskModel.findById(taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  task.timeLogs = task.timeLogs.filter((log: any) => log._id.toString() !== logId);
  task.actualHours = task.timeLogs.reduce((sum, log) => sum + log.hours, 0);
  await task.save();

  const populatedTask = await TaskModel.findById(taskId)
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email")
    .populate("timeLogs.loggedBy", "username email");

  if (populatedTask) {
    emitToProject(populatedTask.project.toString(), "task:updated", populatedTask);
  }

  return populatedTask;
};

export const bulkUpdateTasksService = async (
  taskIds: string[],
  updateData: any,
  updaterId?: string
) => {
  const updates: any = {};
  if (updateData.status !== undefined) updates.status = updateData.status;
  if (updateData.priority !== undefined) updates.priority = updateData.priority;
  if (updateData.isArchived !== undefined) updates.isArchived = updateData.isArchived;
  if (updateData.isDeleted !== undefined) {
    updates.isDeleted = updateData.isDeleted;
    if (updateData.isDeleted) updates.deletedAt = new Date();
  }
  if (updateData.assignedTo !== undefined) {
    updates.assignedTo = Array.isArray(updateData.assignedTo)
      ? updateData.assignedTo.map((id: string) => new mongoose.Types.ObjectId(id))
      : [];
  }

  const results = await TaskModel.updateMany(
    { _id: { $in: taskIds } },
    { $set: updates }
  );

  const tasks = await TaskModel.find({ _id: { $in: taskIds } })
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email");

  if (tasks.length > 0) {
    const projectId = tasks[0].project.toString();
    emitToProject(projectId, "tasks:bulk-updated", { taskIds, updates });
  }

  return results;
};

export const getTrashTasksService = async (
  projectId: string,
  userId: string
) => {
  const project = await ProjectModel.findById(projectId);
  const isProjectAdmin = project && (
    project.createdBy.toString() === userId.toString() ||
    project.members.some(m => m.user.toString() === userId.toString() && m.role === "admin")
  );

  let query: any = { project: projectId, isDeleted: true };

  if (!isProjectAdmin) {
    query.$or = [
      { assignedTo: { $exists: false } },
      { assignedTo: null },
      { assignedTo: { $size: 0 } },
      { assignedTo: userId },
      { createdBy: userId }
    ];
  }

  return await TaskModel.find(query)
    .sort({ deletedAt: -1 })
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email");
};

export const restoreTaskService = async (
  taskId: string,
  userId: string
) => {
  const task = await TaskModel.findById(taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  task.isDeleted = false;
  task.deletedAt = undefined;
  await task.save();

  const populatedTask = await TaskModel.findById(taskId)
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email");

  if (populatedTask) {
    emitToProject(populatedTask.project.toString(), "task:created", populatedTask);
  }

  return populatedTask;
};

export const deleteTaskPermanentlyService = async (
  taskId: string,
  userId: string
) => {
  const task = await TaskModel.findById(taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  await TaskModel.findByIdAndDelete(taskId);
  emitToProject(task.project.toString(), "task:deleted", { taskId });
  return task;
};