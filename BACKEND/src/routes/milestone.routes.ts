import { Router } from "express";
import {
  createMilestone,
  getProjectMilestones,
  updateMilestone,
  deleteMilestone,
} from "../controllers/milestone.controller";
import { userauth } from "../middleware/auth.middleware";

const router = Router();

router.post("/", userauth, createMilestone);
router.get("/project/:projectId", userauth, getProjectMilestones);
router.put("/:milestoneId", userauth, updateMilestone);
router.delete("/:milestoneId", userauth, deleteMilestone);

export default router;
