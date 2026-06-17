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
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsReadController = exports.markAsReadController = exports.getNotificationsController = exports.createNotificationController = void 0;
const notification_service_1 = require("../services/notification.service");
const createNotificationController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notification = yield (0, notification_service_1.createNotification)(req.body);
        res.status(201).json({ success: true, notification });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.createNotificationController = createNotificationController;
const getNotificationsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const type = req.query.type;
        const data = yield (0, notification_service_1.getUserNotifications)(user._id, limit, page, type);
        res.status(200).json(Object.assign({ success: true }, data));
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getNotificationsController = getNotificationsController;
const markAsReadController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const notificationId = req.params.notificationId;
        const notification = yield (0, notification_service_1.markNotificationAsRead)(notificationId, user._id);
        res.status(200).json({ success: true, notification });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.markAsReadController = markAsReadController;
const markAllAsReadController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const result = yield (0, notification_service_1.markAllNotificationsAsRead)(user._id);
        res.status(200).json({ success: true, result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.markAllAsReadController = markAllAsReadController;
