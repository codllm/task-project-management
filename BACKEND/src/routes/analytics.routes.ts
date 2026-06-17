import { Router } from "express";
import { getWorkspaceAnalytics } from "../controllers/analytics.controller";
import { userauth } from "../middleware/auth.middleware";

const router = Router();

router.get("/workspace/:workspaceId", userauth, getWorkspaceAnalytics);

export default router;
