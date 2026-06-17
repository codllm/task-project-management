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
  getTrashProjectsController,
  restoreProjectController,
  deleteProjectPermanentlyController,
  updateProjectColumnsController,
  updateProjectCustomFieldsController,
} from "../controllers/project.controller";

import { userauth } from "../middleware/auth.middleware";
import { isWorkspaceAdmin, blockViewers } from "../middleware/workspace.middleware";
const router = express.Router();

router.post(
  "/create",
  userauth,
  blockViewers,
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
  blockViewers,
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
  blockViewers,
  addMemberToProjectController
);

router.put(
  "/:projectId/remove-member",
  userauth,
  blockViewers,
  removeMemberFromProjectController
);

router.put(
  "/:projectId/change-role",
  userauth,
  blockViewers,
  changeProjectRoleController
);

router.get(
  "/members/:projectId",
  userauth,
  getProjectMembersController
);

// Trash bin
router.get(
  "/trash/workspace/:workspaceId",
  userauth,
  getTrashProjectsController
);

router.put(
  "/restore/:projectId",
  userauth,
  blockViewers,
  restoreProjectController
);

router.delete(
  "/permanent/:projectId",
  userauth,
  isWorkspaceAdmin,
  deleteProjectPermanentlyController
);

router.put(
  "/:projectId/columns",
  userauth,
  blockViewers,
  updateProjectColumnsController
);

router.put(
  "/:projectId/custom-fields",
  userauth,
  blockViewers,
  updateProjectCustomFieldsController
);

export default router;