import express from "express";
import { getWorkspaceActivitiesController } from "../controllers/activity.controller";
import { userauth } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/workspace/:workspaceId", userauth, getWorkspaceActivitiesController);

export default router;
