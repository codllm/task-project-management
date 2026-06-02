import CommentModel from "../model/comment.model";

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

  return comment;
};

export const getTaskCommentsService = async (
  taskId: string
) => {

  const comments = await CommentModel.find({
    task: taskId,
  })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  return comments;
};

export const deleteCommentService = async (
  commentId: string
) => {

  return await CommentModel.findByIdAndDelete(commentId);
};