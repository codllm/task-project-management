import TaskModel from "../model/task.model";
import ProjectModel from "../model/project.model";
import CommentModel from "../model/comment.model";
import { createNotification } from "./notification.service";
import { emitToProject } from "./socket";

export const createTaskService = async (data: any) => {
  const task = await TaskModel.create(data);
  const populatedTask = await TaskModel.findById(task._id)
    .populate("assignedTo", "username email")
    .populate("createdBy", "username email");

  if (!populatedTask) {
    throw new Error("Failed to populate created task");
  }

  emitToProject(populatedTask.project.toString(), "task:created", populatedTask);

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

  let query: any = { project: projectId };

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

  if (!task) {
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

  const commentsCount = await CommentModel.countDocuments({ task: updatedTask._id });
  return {
    ...updatedTask.toObject(),
    commentsCount,
  };
};

export const deleteTaskService = async (
  taskId: string
) => {

  const task = await TaskModel.findByIdAndDelete(taskId);
  
  if (task) {
    emitToProject(task.project.toString(), "task:deleted", { taskId });
  }

  return task;
};