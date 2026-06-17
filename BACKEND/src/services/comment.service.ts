import mongoose from "mongoose";
import CommentModel from "../model/comment.model";
import TaskModel from "../model/task.model";
import ProjectModel from "../model/project.model";
import { createNotification } from "./notification.service";
import { emitToProject } from "./socket";
import { createActivityLog } from "./activity.service";
import { parseAndNotifyMentions } from "./mention.service";

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
    .populate("user", "username email")
    .populate("reactions.user", "username email");

  if (!populatedComment) {
    throw new Error("Failed to populate created comment");
  }

  const task = await TaskModel.findById(taskId);
  if (task) {
    const title = "New Comment on Task";
    const message = `A comment was added to task "${task.title}"`;
    const link = `/projects/${task.project}/tasks/${task._id}`;

    emitToProject(task.project.toString(), "comment:created", populatedComment);

    const project = await ProjectModel.findById(task.project);
    if (project) {
      await createActivityLog({
        workspace: project.workspace.toString(),
        project: project._id.toString(),
        task: task._id.toString(),
        user: userId,
        action: "comment_added",
        details: `commented on task "${task.title}": "${content.substring(0, 30)}${content.length > 30 ? "..." : ""}"`,
      });
    }

    // Call mentions service
    await parseAndNotifyMentions(content, userId, task, true);

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
    .populate("reactions.user", "username email")
    .sort({ createdAt: -1 });

  return comments;
};

export const updateCommentService = async (
  commentId: string,
  content: string,
  userId: string
) => {
  const comment = await CommentModel.findById(commentId).populate("task");
  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.user.toString() !== userId.toString()) {
    throw new Error("Unauthorized: Only the author can edit this comment");
  }

  comment.content = content;
  await comment.save();

  const populatedComment = await CommentModel.findById(commentId)
    .populate("user", "username email")
    .populate("reactions.user", "username email");

  if (comment.task) {
    emitToProject((comment.task as any).project.toString(), "comment:updated", populatedComment);
  }

  return populatedComment;
};

export const toggleCommentReactionService = async (
  commentId: string,
  emoji: string,
  userId: string
) => {
  const comment = await CommentModel.findById(commentId).populate("task");
  if (!comment) {
    throw new Error("Comment not found");
  }

  const existingReactionIndex = comment.reactions.findIndex(
    (r) => r.user.toString() === userId.toString() && r.emoji === emoji
  );

  if (existingReactionIndex > -1) {
    comment.reactions.splice(existingReactionIndex, 1);
  } else {
    comment.reactions.push({ user: new mongoose.Types.ObjectId(userId) as any, emoji });
  }

  await comment.save();

  const populatedComment = await CommentModel.findById(commentId)
    .populate("user", "username email")
    .populate("reactions.user", "username email");

  if (comment.task) {
    emitToProject((comment.task as any).project.toString(), "comment:updated", populatedComment);
  }

  return populatedComment;
};

export const deleteCommentService = async (
  commentId: string,
  userId: string
) => {

  const comment = await CommentModel.findById(commentId).populate("task");
  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.user.toString() !== userId.toString()) {
    throw new Error("Unauthorized: Only the author can delete this comment");
  }

  await CommentModel.findByIdAndDelete(commentId);

  if (comment.task) {
    emitToProject((comment.task as any).project.toString(), "comment:deleted", { commentId });
  }

  return comment;
};