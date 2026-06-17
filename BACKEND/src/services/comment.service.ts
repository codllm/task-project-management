import CommentModel from "../model/comment.model";
import TaskModel from "../model/task.model";
import { createNotification } from "./notification.service";
import { emitToProject } from "./socket";

export const createCommentService = async (
  content: string,
  taskId: string,
  userId: string
) => {

  const comment = await CommentModel.create({
    content,
    task: taskId,
    user: userId,
  });

  const populatedComment = await CommentModel.findById(comment._id)
    .populate("user", "username email");

  if (!populatedComment) {
    throw new Error("Failed to populate created comment");
  }

  const task = await TaskModel.findById(taskId);
  if (task) {
    const title = "New Comment on Task";
    const message = `A comment was added to task "${task.title}"`;
    const link = `/projects/${task.project}/tasks/${task._id}`;

    emitToProject(task.project.toString(), "comment:created", populatedComment);

    const assigneesList = task.assignedTo ? (task.assignedTo as any[]).map(a => a.toString()) : [];
    for (const assigneeId of assigneesList) {
      if (assigneeId !== userId.toString()) {
        await createNotification({
          recipient: assigneeId,
          sender: userId,
          type: "COMMENT_ADDED",
          title,
          message,
          link,
        });
      }
    }

    if (
      task.createdBy &&
      task.createdBy.toString() !== userId.toString() &&
      !assigneesList.includes(task.createdBy.toString())
    ) {
      await createNotification({
        recipient: task.createdBy.toString(),
        sender: userId,
        type: "COMMENT_ADDED",
        title,
        message,
        link,
      });
    }
  }

  return populatedComment;
};

export const getTaskCommentsService = async (
  taskId: string
) => {

  const comments = await CommentModel.find({
    task: taskId,
  })
    .populate("user", "username email")
    .sort({ createdAt: -1 });

  return comments;
};

export const deleteCommentService = async (
  commentId: string
) => {

  const comment = await CommentModel.findById(commentId).populate("task");
  if (!comment) {
    throw new Error("Comment not found");
  }

  await CommentModel.findByIdAndDelete(commentId);

  if (comment.task) {
    emitToProject((comment.task as any).project.toString(), "comment:deleted", { commentId });
  }

  return comment;
};