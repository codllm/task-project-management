import express from "express";

import {
  createCommentController,
  getTaskCommentsController,
  deleteCommentController,
  updateCommentController,
  toggleCommentReactionController,
} from "../controllers/comment.controller";

import { userauth } from "../middleware/auth.middleware";
import { blockViewers } from "../middleware/workspace.middleware";

const router = express.Router();

router.post(
  "/task/:taskId",
  userauth,
  blockViewers,
  createCommentController
);

router.get(
  "/task/:taskId",
  userauth,
  getTaskCommentsController
);

router.put(
  "/:commentId",
  userauth,
  blockViewers,
  updateCommentController
);

router.post(
  "/:commentId/react",
  userauth,
  blockViewers,
  toggleCommentReactionController
);

router.delete(
  "/:commentId",
  userauth,
  blockViewers,
  deleteCommentController
);

export default router;