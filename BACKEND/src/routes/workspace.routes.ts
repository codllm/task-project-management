
import express from "express";

import {
  createWorkspaceController,
  getWorkspaceByIdController,
  getUserWorkspacesController,
  updateWorkspaceController,
  addUserToWorkspaceController,
  removeUserFromWorkspaceController,
  leaveWorkspaceController,
  deleteWorkspaceController,
  changeWorkspaceRoleController,
} from "../controllers/workspace.controller";

import { userauth } from "../middleware/auth.middleware";
import { isWorkspaceAdmin } from "../middleware/workspace.middleware";

const router = express.Router();

router.post(
  "/create",
  userauth,
  createWorkspaceController
);
//create workspace

router.get(
  "/user/:userId",
  userauth,
  getUserWorkspacesController
);
//it gives all the workspaces of a user

router.get(
  "/:workspaceId",
  userauth,
  getWorkspaceByIdController
);
//workspace details by id(all members along with details n workspace details)

router.put(
  "/update/:workspaceId",
  userauth,
  isWorkspaceAdmin,
  updateWorkspaceController
);

router.put(
  "/:workspaceId/add-member",
  userauth,
  isWorkspaceAdmin,
  addUserToWorkspaceController
);

router.put(
  "/:workspaceId/remove-member",
  userauth,
  isWorkspaceAdmin,
  removeUserFromWorkspaceController
);

router.put(
  "/:workspaceId/change-role",
  userauth,
  isWorkspaceAdmin,
  changeWorkspaceRoleController
);

router.put(
  "/:workspaceId/leave",
  userauth,
  leaveWorkspaceController
);

router.delete(
  "/delete/:workspaceId",
  userauth,
  isWorkspaceAdmin,
  deleteWorkspaceController
);

export default router;