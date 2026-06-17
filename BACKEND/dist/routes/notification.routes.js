"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const notification_controller_1 = require("../controllers/notification.controller");
const router = (0, express_1.Router)();
// Retrieve notifications for authenticated user (can filter by ?type=...)
router.get("/", auth_middleware_1.userauth, notification_controller_1.getNotificationsController);
// Specific routes for each notification type as previously requested
router.get("/task-assigned", auth_middleware_1.userauth, (req, res) => { req.query.type = "TASK_ASSIGNED"; return (0, notification_controller_1.getNotificationsController)(req, res); });
router.get("/task-updated", auth_middleware_1.userauth, (req, res) => { req.query.type = "TASK_UPDATED"; return (0, notification_controller_1.getNotificationsController)(req, res); });
router.get("/project-added", auth_middleware_1.userauth, (req, res) => { req.query.type = "PROJECT_ADDED"; return (0, notification_controller_1.getNotificationsController)(req, res); });
router.get("/workspace-invite", auth_middleware_1.userauth, (req, res) => { req.query.type = "WORKSPACE_INVITE"; return (0, notification_controller_1.getNotificationsController)(req, res); });
router.get("/comment-added", auth_middleware_1.userauth, (req, res) => { req.query.type = "COMMENT_ADDED"; return (0, notification_controller_1.getNotificationsController)(req, res); });
// Create a new notification manually
router.post("/create", auth_middleware_1.userauth, notification_controller_1.createNotificationController);
// Mark specific notification as read
router.put("/:notificationId/read", auth_middleware_1.userauth, notification_controller_1.markAsReadController);
// Mark all as read
router.put("/read-all", auth_middleware_1.userauth, notification_controller_1.markAllAsReadController);
exports.default = router;
