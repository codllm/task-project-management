import express from "express";

import {
  createProjectController,
  getProjectByIdController,
  getWorkspaceProjectsController,
  updateProjectController,
  deleteProjectController,
  addMemberToProjectController,
  removeMemberFromProjectController,
  getProjectMembersController,
  changeProjectRoleController,
} from "../controllers/project.controller";

import { userauth } from "../middleware/auth.middleware";
import { isWorkspaceAdmin } from "../middleware/workspace.middleware";
const router = express.Router();

router.post(
  "/create",
  userauth,
  createProjectController
);

router.get(
  "/:projectId",
  userauth,
  getProjectByIdController
);

router.get(
  "/workspace/:workspaceId",
  userauth,
  getWorkspaceProjectsController
);

router.put(
  "/update/:projectId",
  userauth,
  updateProjectController
);

router.delete(
  "/delete/:projectId",
  userauth,
  isWorkspaceAdmin,
  deleteProjectController
);

router.put(
  "/:projectId/add-member",
  userauth,
  addMemberToProjectController
);

router.put(
  "/:projectId/remove-member",
  userauth,
  removeMemberFromProjectController
);

router.put(
  "/:projectId/change-role",
  userauth,
  changeProjectRoleController
);

router.get(
  "/members/:projectId",
  userauth,
  getProjectMembersController
);

export default router;