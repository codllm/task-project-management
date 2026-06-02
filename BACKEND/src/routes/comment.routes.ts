import express from "express";

import {
  createCommentController,
  getTaskCommentsController,
  deleteCommentController,
} from "../controllers/comment.controller";

import { userauth } from "../middleware/auth.middleware";

const router = express.Router();

router.post(
  "/task/:taskId",
  userauth,
  createCommentController
);

router.get(
  "/task/:taskId",
  userauth,
  getTaskCommentsController
);

router.delete(
  "/:commentId",
  userauth,
  deleteCommentController
);

export default router;