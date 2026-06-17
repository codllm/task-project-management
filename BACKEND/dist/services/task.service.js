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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTaskService = exports.updateTaskService = exports.getSingleTaskService = exports.getProjectTasksService = exports.createTaskService = void 0;
const task_model_1 = __importDefault(require("../model/task.model"));
const project_model_1 = __importDefault(require("../model/project.model"));
const notification_service_1 = require("./notification.service");
const socket_1 = require("./socket");
const createTaskService = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const task = yield task_model_1.default.create(data);
    const populatedTask = yield task_model_1.default.findById(task._id)
        .populate("assignedTo", "username email")
        .populate("createdBy", "username email");
    if (!populatedTask) {
        throw new Error("Failed to populate created task");
    }
    (0, socket_1.emitToProject)(populatedTask.project.toString(), "task:created", populatedTask);
    if (populatedTask.assignedTo && Array.isArray(populatedTask.assignedTo)) {
        for (const assignee of populatedTask.assignedTo) {
            const assigneeId = assignee._id.toString();
            if (assigneeId !== populatedTask.createdBy._id.toString()) {
                yield (0, notification_service_1.createNotification)({
                    recipient: assigneeId,
                    sender: populatedTask.createdBy._id.toString(),
                    type: "TASK_ASSIGNED",
                    title: "New Task Assigned",
                    message: `You have been assigned to the task: "${populatedTask.title}"`,
                    link: `/projects/${populatedTask.project}/tasks/${populatedTask._id}`,
                });
            }
        }
    }
    return populatedTask;
});
exports.createTaskService = createTaskService;
const getProjectTasksService = (projectId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield project_model_1.default.findById(projectId);
    const isProjectAdmin = project && (project.createdBy.toString() === userId.toString() ||
        project.members.some(m => m.user.toString() === userId.toString() && m.role === "admin"));
    let query = { project: projectId };
    if (!isProjectAdmin) {
        query.$or = [
            { assignedTo: { $exists: false } },
            { assignedTo: null },
            { assignedTo: { $size: 0 } },
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }
    return yield task_model_1.default.find(query)
        .populate("assignedTo", "username email")
        .populate("createdBy", "username email");
});
exports.getProjectTasksService = getProjectTasksService;
const getSingleTaskService = (taskId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const task = yield task_model_1.default.findById(taskId)
        .populate("assignedTo", "username email")
        .populate("createdBy", "username email");
    if (!task) {
        return null;
    }
    const project = yield project_model_1.default.findById(task.project);
    const isProjectAdmin = project && (project.createdBy.toString() === userId.toString() ||
        project.members.some(m => m.user.toString() === userId.toString() && m.role === "admin"));
    const assigneesList = task.assignedTo ? task.assignedTo.map(a => a._id.toString()) : [];
    const isAssigned = assigneesList.includes(userId.toString());
    const isCreator = task.createdBy._id.toString() === userId.toString();
    const isUnassigned = assigneesList.length === 0;
    if (!isProjectAdmin && !isAssigned && !isCreator && !isUnassigned) {
        throw new Error("Unauthorized to access this task");
    }
    return task;
});
exports.getSingleTaskService = getSingleTaskService;
const updateTaskService = (taskId, data, updaterId) => __awaiter(void 0, void 0, void 0, function* () {
    const originalTask = yield task_model_1.default.findById(taskId);
    if (!originalTask) {
        throw new Error("Task not found");
    }
    const { newAttachments } = data, updateData = __rest(data, ["newAttachments"]);
    let updateQuery = { $set: updateData };
    if (newAttachments && newAttachments.length > 0) {
        updateQuery.$push = { attachments: { $each: newAttachments } };
    }
    const updatedTask = yield task_model_1.default.findByIdAndUpdate(taskId, updateQuery, { new: true })
        .populate("assignedTo", "username email")
        .populate("createdBy", "username email");
    if (!updatedTask) {
        throw new Error("Task not found");
    }
    (0, socket_1.emitToProject)(updatedTask.project.toString(), "task:updated", updatedTask);
    // Notify newly added assignees
    if (data.assignedTo && Array.isArray(data.assignedTo)) {
        const originalAssignees = originalTask.assignedTo ? originalTask.assignedTo.map(id => id.toString()) : [];
        const newAssignees = data.assignedTo.map((id) => id.toString());
        const addedAssignees = newAssignees.filter((id) => !originalAssignees.includes(id));
        for (const assigneeId of addedAssignees) {
            if (assigneeId !== updaterId) {
                yield (0, notification_service_1.createNotification)({
                    recipient: assigneeId,
                    sender: updaterId || updatedTask.createdBy._id.toString(),
                    type: "TASK_ASSIGNED",
                    title: "New Task Assigned",
                    message: `You have been assigned to the task: "${updatedTask.title}"`,
                    link: `/projects/${updatedTask.project}/tasks/${updatedTask._id}`,
                });
            }
        }
    }
    // Notify other task members about general task updates or attachments
    const assigneesList = updatedTask.assignedTo ? updatedTask.assignedTo.map(a => a._id.toString()) : [];
    if (newAttachments && newAttachments.length > 0) {
        const title = "New Attachment on Task";
        const message = `${newAttachments.length} new file(s) uploaded to task "${updatedTask.title}"`;
        const link = `/projects/${updatedTask.project}/tasks/${updatedTask._id}`;
        for (const assigneeId of assigneesList) {
            if (assigneeId !== updaterId) {
                yield (0, notification_service_1.createNotification)({
                    recipient: assigneeId,
                    sender: updaterId || updatedTask.createdBy._id.toString(),
                    type: "TASK_UPDATED",
                    title,
                    message,
                    link,
                });
            }
        }
        if (updatedTask.createdBy &&
            updatedTask.createdBy._id.toString() !== updaterId &&
            !assigneesList.includes(updatedTask.createdBy._id.toString())) {
            yield (0, notification_service_1.createNotification)({
                recipient: updatedTask.createdBy._id.toString(),
                sender: updaterId || updatedTask.createdBy._id.toString(),
                type: "TASK_UPDATED",
                title,
                message,
                link,
            });
        }
    }
    else if (updaterId) {
        for (const assigneeId of assigneesList) {
            if (assigneeId !== updaterId) {
                yield (0, notification_service_1.createNotification)({
                    recipient: assigneeId,
                    sender: updaterId,
                    type: "TASK_UPDATED",
                    title: "Task Updated",
                    message: `The task: "${updatedTask.title}" assigned to you was updated`,
                    link: `/projects/${updatedTask.project}/tasks/${updatedTask._id}`,
                });
            }
        }
    }
    return updatedTask;
});
exports.updateTaskService = updateTaskService;
const deleteTaskService = (taskId) => __awaiter(void 0, void 0, void 0, function* () {
    const task = yield task_model_1.default.findByIdAndDelete(taskId);
    if (task) {
        (0, socket_1.emitToProject)(task.project.toString(), "task:deleted", { taskId });
    }
    return task;
});
exports.deleteTaskService = deleteTaskService;
