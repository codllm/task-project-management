"use strict";
// services/project.service.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectMembers = exports.changeProjectRole = exports.removeMemberFromProject = exports.addMemberToProject = exports.deleteProject = exports.updateProject = exports.getWorkspaceProjects = exports.getProjectById = exports.createProject = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const project_model_1 = __importDefault(require("../model/project.model"));
const workspace_model_1 = __importDefault(require("../model/workspace.model"));
const notification_service_1 = require("./notification.service");
const createProject = (_a) => __awaiter(void 0, [_a], void 0, function* ({ name, description, workspace, createdBy, deadline, color, }) {
    const workspaceExists = yield workspace_model_1.default.findById(workspace);
    if (!workspaceExists) {
        throw new Error("Workspace not found");
    }
    const project = yield project_model_1.default.create({
        name,
        description,
        workspace,
        createdBy,
        deadline,
        color,
        members: [
            {
                user: createdBy,
                role: "admin",
            },
        ],
    });
    const otherMembers = workspaceExists.members.filter((m) => {
        const memberUserId = (m && typeof m === "object" && m.user) ? m.user.toString() : (m ? m.toString() : "");
        return memberUserId !== createdBy.toString() && memberUserId !== "";
    });
    for (const member of otherMembers) {
        const memberUserId = (member && typeof member === "object" && member.user) ? member.user.toString() : member.toString();
        yield (0, notification_service_1.createNotification)({
            recipient: memberUserId,
            sender: createdBy.toString(),
            type: "PROJECT_ADDED",
            title: "New Project Added",
            message: `A new project "${project.name}" was added to workspace "${workspaceExists.name}"`,
            link: `/projects/${project._id}`,
        });
    }
    return project;
});
exports.createProject = createProject;
// GET PROJECT BY ID
const getProjectById = (projectId) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield project_model_1.default.findById(projectId)
        .populate("workspace")
        .populate("members.user")
        .populate("createdBy");
    if (!project) {
        throw new Error("Project not found");
    }
    return project;
});
exports.getProjectById = getProjectById;
// GET WORKSPACE PROJECTS
const getWorkspaceProjects = (workspaceId) => __awaiter(void 0, void 0, void 0, function* () {
    const projects = yield project_model_1.default.find({
        workspace: workspaceId,
    }).populate("members.user");
    return projects;
});
exports.getWorkspaceProjects = getWorkspaceProjects;
const updateProject = (_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, name, description, status, deadline, }) {
    const project = yield project_model_1.default.findById(projectId);
    if (!project) {
        throw new Error("Project not found");
    }
    if (name) {
        project.name = name;
    }
    if (description) {
        project.description = description;
    }
    if (status) {
        project.status = status;
    }
    if (deadline) {
        project.deadline = deadline;
    }
    yield project.save();
    return project;
});
exports.updateProject = updateProject;
// DELETE PROJECT
const deleteProject = (projectId) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield project_model_1.default.findById(projectId);
    if (!project) {
        throw new Error("Project not found");
    }
    yield project_model_1.default.findByIdAndDelete(projectId);
    return {
        message: "Project deleted successfully",
    };
});
exports.deleteProject = deleteProject;
// ADD MEMBER TO PROJECT
const addMemberToProject = (projectId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield project_model_1.default.findById(projectId);
    if (!project) {
        throw new Error("Project not found");
    }
    const workspace = yield workspace_model_1.default.findById(project.workspace);
    if (!workspace) {
        throw new Error("Workspace not found");
    }
    const isWorkspaceMember = workspace.members.some((member) => member.user.toString() === userId);
    if (!isWorkspaceMember) {
        throw new Error("User is not member of workspace");
    }
    const isProjectMember = project.members.some((member) => member.user.toString() === userId);
    if (isProjectMember) {
        throw new Error("User already exists in project");
    }
    project.members.push({
        user: new mongoose_1.default.Types.ObjectId(userId),
        role: "member",
    });
    yield project.save();
    return project;
});
exports.addMemberToProject = addMemberToProject;
// REMOVE MEMBER FROM PROJECT
const removeMemberFromProject = (projectId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield project_model_1.default.findById(projectId);
    if (!project) {
        throw new Error("Project not found");
    }
    project.members = project.members.filter((member) => member.user.toString() !== userId);
    yield project.save();
    return project;
});
exports.removeMemberFromProject = removeMemberFromProject;
// CHANGE PROJECT ROLE
const changeProjectRole = (projectId, userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield project_model_1.default.findById(projectId);
    if (!project) {
        throw new Error("Project not found");
    }
    const member = project.members.find((member) => member.user.toString() === userId);
    if (!member) {
        throw new Error("Member not found");
    }
    member.role = role;
    yield project.save();
    return project;
});
exports.changeProjectRole = changeProjectRole;
// GET PROJECT MEMBERS
const getProjectMembers = (projectId) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield project_model_1.default.findById(projectId).populate("members.user");
    if (!project) {
        throw new Error("Project not found");
    }
    return project.members;
});
exports.getProjectMembers = getProjectMembers;
