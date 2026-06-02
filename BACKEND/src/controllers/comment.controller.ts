import { Request, Response } from "express";
import {
  createCommentService,
  getTaskCommentsService,
  deleteCommentService,
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

export const deleteCommentController = async (
  req: Request,
  res: Response
) => {
  try {

    const commentId  = req.params.commentId as string;

    await deleteCommentService(commentId);

    return res.status(200).json({
      success: true,
      message: "Comment deleted",
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });

  }
};