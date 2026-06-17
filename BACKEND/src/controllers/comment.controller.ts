import { Request, Response } from "express";
import {
  createCommentService,
  getTaskCommentsService,
  deleteCommentService,
  updateCommentService,
  toggleCommentReactionService,
} from "../services/comment.service";

export const createCommentController = async (
  req: Request,
  res: Response
) => {
  try {

    const { content } = req.body;
    const taskId = req.params.taskId as string;

    const userId = (req as any).user._id;

    const comment = await createCommentService(
      content,
      taskId,
      userId
    );

    return res.status(201).json({
      success: true,
      comment,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to create comment",
    });

  }
};

export const getTaskCommentsController = async (
  req: Request,
  res: Response
) => {
  try {

    const taskId = req.params.taskId as string;

    const comments = await getTaskCommentsService(taskId);

    return res.status(200).json({
      success: true,
      comments,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
    });

  }
};

export const updateCommentController = async (
  req: Request,
  res: Response
) => {
  try {
    const { content } = req.body;
    const commentId = req.params.commentId as string;
    const userId = (req as any).user._id;

    const comment = await updateCommentService(commentId, content, userId);

    return res.status(200).json({
      success: true,
      comment,
    });
  } catch (error: any) {
    return res.status(error.message?.includes("Unauthorized") ? 403 : 500).json({
      success: false,
      message: error.message || "Failed to update comment",
    });
  }
};

export const toggleCommentReactionController = async (
  req: Request,
  res: Response
) => {
  try {
    const { emoji } = req.body;
    const commentId = req.params.commentId as string;
    const userId = (req as any).user._id;

    const comment = await toggleCommentReactionService(commentId, emoji, userId);

    return res.status(200).json({
      success: true,
      comment,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle reaction",
    });
  }
};

export const deleteCommentController = async (
  req: Request,
  res: Response
) => {
  try {

    const commentId  = req.params.commentId as string;
    const userId = (req as any).user._id;

    await deleteCommentService(commentId, userId);

    return res.status(200).json({
      success: true,
      message: "Comment deleted",
    });

  } catch (error: any) {

    return res.status(error.message?.includes("Unauthorized") ? 403 : 500).json({
      success: false,
      message: error.message || "Failed to delete comment",
    });

  }
};