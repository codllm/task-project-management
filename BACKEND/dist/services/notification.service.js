"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUserNotifications = exports.createNotification = void 0;
const notification_model_1 = __importDefault(require("../model/notification.model"));
const socket_1 = require("./socket");
/**
 * Create a new notification, save to DB, and emit to Socket.io user room
 */
const createNotification = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield notification_model_1.default.create(payload);
    // Populate sender details for the socket event
    const populatedNotification = yield notification_model_1.default.findById(notification._id)
        .populate("sender", "username email");
    // Emit a real-time socket event directly to the recipient's room
    (0, socket_1.emitToUser)(payload.recipient.toString(), "notification:received", populatedNotification);
    return notification;
});
exports.createNotification = createNotification;
/**
 * Fetch latest notifications for a specific user
 */
const getUserNotifications = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, limit = 20, page = 1, type) {
    const skip = (page - 1) * limit;
    const query = { recipient: userId };
    if (type) {
        query.type = type;
    }
    const notifications = yield notification_model_1.default.find(query)
        .populate("sender", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const unreadCount = yield notification_model_1.default.countDocuments(Object.assign(Object.assign({}, query), { read: false }));
    return { notifications, unreadCount };
});
exports.getUserNotifications = getUserNotifications;
/**
 * Mark a specific notification as read
 */
const markNotificationAsRead = (notificationId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield notification_model_1.default.findOneAndUpdate({ _id: notificationId, recipient: userId }, { $set: { read: true } }, { new: true }).populate("sender", "username email");
    if (!notification) {
        throw new Error("Notification not found or unauthorized");
    }
    // Notify the client about read state change
    (0, socket_1.emitToUser)(userId, "notification:updated", notification);
    return notification;
});
exports.markNotificationAsRead = markNotificationAsRead;
/**
 * Mark all notifications for a user as read
 */
const markAllNotificationsAsRead = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.default.updateMany({ recipient: userId, read: false }, { $set: { read: true } });
    // Notify client to clear local unread count
    (0, socket_1.emitToUser)(userId, "notifications:read-all", { userId });
    return { success: true, modifiedCount: result.modifiedCount };
});
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
