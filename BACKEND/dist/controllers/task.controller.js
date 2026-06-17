"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTaskController = exports.updateTaskController = exports.getSingleTaskController = exports.getProjectTasksController = exports.createTaskController = void 0;
const task_service_1 = require("../services/task.service");
const createTaskController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const task = yield (0, task_service_1.createTaskService)(Object.assign(Object.assign({}, req.body), { createdBy: userId }));
        return res.status(201).json({
            success: true,
            task,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create task",
        });
    }
});
exports.createTaskController = createTaskController;
const getProjectTasksController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = req.params.projectId;
        const userId = req.user._id;
        const tasks = yield (0, task_service_1.getProjectTasksService)(projectId, userId);
        return res.status(200).json({
            success: true,
            tasks,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch tasks",
        });
    }
});
exports.getProjectTasksController = getProjectTasksController;
const getSingleTaskController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = req.params.taskId;
        const userId = req.user._id;
        const task = yield (0, task_service_1.getSingleTaskService)(taskId, userId);
        return res.status(200).json({
            success: true,
            task,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch task",
        });
    }
});
exports.getSingleTaskController = getSingleTaskController;
const updateTaskController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId } = req.params;
        const userId = req.user._id;
        const updatedTask = yield (0, task_service_1.updateTaskService)(taskId, req.body, userId);
        return res.status(200).json({
            success: true,
            updatedTask,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update task",
        });
    }
});
exports.updateTaskController = updateTaskController;
const deleteTaskController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = req.params.taskId;
        yield (0, task_service_1.deleteTaskService)(taskId);
        return res.status(200).json({
            success: true,
            message: "Task deleted",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete task",
        });
    }
});
exports.deleteTaskController = deleteTaskController;
