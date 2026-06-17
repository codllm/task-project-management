import api from "./user.api";

export interface Comment {
  _id: string;
  task: string;
  user?: {
    _id: string;
    username: {
      firstname: string;
      lastname: string;
    };
    email: string;
    profilePic?: string;
  };
  sender?: {
    _id: string;
    username: {
      firstname: string;
      lastname: string;
    };
    email: string;
    profilePic?: string;
  };
  content: string;
  reactions?: {
    user: {
      _id: string;
      username: {
        firstname: string;
        lastname: string;
      };
      email: string;
    } | string;
    emoji: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export const createComment = async (
  taskId: string,
  content: string
): Promise<{ success: boolean; comment: Comment }> => {
  const res = await api.post(`/api/comments/task/${taskId}`, { content });
  return res.data;
};

export const getTaskComments = async (
  taskId: string
): Promise<{ success: boolean; comments: Comment[] }> => {
  const res = await api.get(`/api/comments/task/${taskId}`);
  return res.data;
};

export const updateComment = async (
  commentId: string,
  content: string
): Promise<{ success: boolean; comment: Comment }> => {
  const res = await api.put(`/api/comments/${commentId}`, { content });
  return res.data;
};

export const toggleCommentReaction = async (
  commentId: string,
  emoji: string
): Promise<{ success: boolean; comment: Comment }> => {
  const res = await api.post(`/api/comments/${commentId}/react`, { emoji });
  return res.data;
};

export const deleteComment = async (
  commentId: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/api/comments/${commentId}`);
  return res.data;
};
