"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const workspace_controller_1 = require("../controllers/workspace.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const workspace_middleware_1 = require("../middleware/workspace.middleware");
const router = express_1.default.Router();
router.post("/create", auth_middleware_1.userauth, workspace_controller_1.createWorkspaceController);
//create workspace
router.get("/user/:userId", auth_middleware_1.userauth, workspace_controller_1.getUserWorkspacesController);
//it gives all the workspaces of a user
router.get("/:workspaceId", auth_middleware_1.userauth, workspace_controller_1.getWorkspaceByIdController);
//workspace details by id(all members along with details n workspace details)
router.put("/update/:workspaceId", auth_middleware_1.userauth, workspace_middleware_1.isWorkspaceAdmin, workspace_controller_1.updateWorkspaceController);
router.put("/:workspaceId/add-member", auth_middleware_1.userauth, workspace_middleware_1.isWorkspaceAdmin, workspace_controller_1.addUserToWorkspaceController);
router.put("/:workspaceId/remove-member", auth_middleware_1.userauth, workspace_middleware_1.isWorkspaceAdmin, workspace_controller_1.removeUserFromWorkspaceController);
router.put("/:workspaceId/change-role", auth_middleware_1.userauth, workspace_middleware_1.isWorkspaceAdmin, workspace_controller_1.changeWorkspaceRoleController);
router.put("/:workspaceId/leave", auth_middleware_1.userauth, workspace_controller_1.leaveWorkspaceController);
router.delete("/delete/:workspaceId", auth_middleware_1.userauth, workspace_middleware_1.isWorkspaceAdmin, workspace_controller_1.deleteWorkspaceController);
exports.default = router;
