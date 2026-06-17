"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const searchUser_controller_1 = require("../controllers/searchUser.controller");
const router = (0, express_1.Router)();
// Individual search endpoints
router.get("/users", auth_middleware_1.userauth, searchUser_controller_1.searchUsersController);
router.get("/workspaces", auth_middleware_1.userauth, searchUser_controller_1.searchWorkspacesController);
router.get("/projects", auth_middleware_1.userauth, searchUser_controller_1.searchProjectsController);
router.get("/tasks", auth_middleware_1.userauth, searchUser_controller_1.searchTasksController);
// Unified global search endpoint
router.get("/global", auth_middleware_1.userauth, searchUser_controller_1.globalSearchController);
// Keep the old route for backwards compatibility if needed by frontend
router.get("/user/suggestion/:query", auth_middleware_1.userauth, searchUser_controller_1.searchUsersController);
exports.default = router;
