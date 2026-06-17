"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const task_controller_1 = require("../controllers/task.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/create", auth_middleware_1.userauth, task_controller_1.createTaskController);
router.get("/project/:projectId", auth_middleware_1.userauth, task_controller_1.getProjectTasksController);
router.get("/:taskId", auth_middleware_1.userauth, task_controller_1.getSingleTaskController);
router.put("/:taskId", auth_middleware_1.userauth, task_controller_1.updateTaskController);
router.delete("/:taskId", auth_middleware_1.userauth, task_controller_1.deleteTaskController);
exports.default = router;
