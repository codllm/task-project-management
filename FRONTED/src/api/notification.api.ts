import api from "./user.api";

export interface Notification {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    username: {
      firstname: string;
      lastname: string;
    };
    email: string;
    profilePic?: string;
  };
  type: "WORKSPACE_INVITE" | "PROJECT_ADDED" | "TASK_ASSIGNED" | "TASK_UPDATED" | "COMMENT_ADDED";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export const getNotifications = async (
  type?: string
): Promise<{ success: boolean; notifications: Notification[] }> => {
  const url = type ? `/api/notifications?type=${type}` : "/api/notifications";
  const res = await api.get(url);
  return res.data;
};

export const markNotificationRead = async (
  notificationId: string
): Promise<{ success: boolean; notification: Notification }> => {
  const res = await api.put(`/api/notifications/${notificationId}/read`);
  return res.data;
};

export const markAllNotificationsRead = async (): Promise<{ success: boolean; message: string }> => {
  const res = await api.put("/api/notifications/read-all");
  return res.data;
};
