import { Request, Response } from "express";
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notification.service";

export const createNotificationController = async (req: Request, res: Response) => {
  try {
    const notification = await createNotification(req.body);
    res.status(201).json({ success: true, notification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getNotificationsController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const type = req.query.type as string;

    const data = await getUserNotifications(user._id, limit, page, type);
    res.status(200).json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsReadController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const notificationId = req.params.notificationId as string;

    const notification = await markNotificationAsRead(notificationId, user._id);
    res.status(200).json({ success: true, notification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllAsReadController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const result = await markAllNotificationsAsRead(user._id);
    res.status(200).json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
