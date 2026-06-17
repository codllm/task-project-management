import express from "express";

import {
  createTaskController,
  getProjectTasksController,
  getSingleTaskController,
  updateTaskController,
  deleteTaskController,
  getArchivedProjectTasksController,
  logTimeController,
  deleteTimeLogController,
  bulkUpdateController,
  getTrashTasksController,
  restoreTaskController,
  deleteTaskPermanentlyController,
} from "../controllers/task.controller";

import { userauth } from "../middleware/auth.middleware";
import { blockViewers } from "../middleware/workspace.middleware";

const router = express.Router();

router.post(
  "/create",
  userauth,
  blockViewers,
  createTaskController
);

router.get(
  "/project/:projectId",
  userauth,
  getProjectTasksController
);

router.get(
  "/project/:projectId/archived",
  userauth,
  getArchivedProjectTasksController
);

router.get(
  "/:taskId",
  userauth,
  getSingleTaskController
);

router.put(
  "/:taskId",
  userauth,
  blockViewers,
  updateTaskController
);

router.delete(
  "/:taskId",
  userauth,
  blockViewers,
  deleteTaskController
);

// Time tracking
router.post(
  "/:taskId/time-log",
  userauth,
  blockViewers,
  logTimeController
);

router.delete(
  "/:taskId/time-log/:logId",
  userauth,
  blockViewers,
  deleteTimeLogController
);

// Bulk updates
router.post(
  "/bulk-update",
  userauth,
  blockViewers,
  bulkUpdateController
);

// Trash bin
router.get(
  "/trash/list/:projectId",
  userauth,
  getTrashTasksController
);

router.put(
  "/:taskId/restore",
  userauth,
  blockViewers,
  restoreTaskController
);

router.delete(
  "/:taskId/permanent",
  userauth,
  blockViewers,
  deleteTaskPermanentlyController
);

export default router;