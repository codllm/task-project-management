import express from "express";

import {
  createTaskController,
  getProjectTasksController,
  getSingleTaskController,
  updateTaskController,
  deleteTaskController,
} from "../controllers/task.controller";

import { userauth } from "../middleware/auth.middleware";

const router = express.Router();

router.post(
  "/create",
  userauth,
  createTaskController
);

router.get(
  "/project/:projectId",
  userauth,
  getProjectTasksController
);

router.get(
  "/:taskId",
  userauth,
  getSingleTaskController
);

router.put(
  "/:taskId",
  userauth,
  updateTaskController
);

router.delete(
  "/:taskId",
  userauth,
  deleteTaskController
);

export default router;