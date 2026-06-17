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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWorkspace = exports.leaveWorkspace = exports.changeWorkspaceRole = exports.removeUserFromWorkspace = exports.addUserToWorkspace = exports.updateWorkspace = exports.getUserWorkspaces = exports.getWorkspaceById = exports.createWorkspace = void 0;
const workspace_model_1 = __importDefault(require("../model/workspace.model"));
const project_model_1 = __importDefault(require("../model/project.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const notification_service_1 = require("./notification.service");
// CREATE WORKSPACE
const createWorkspace = (_a) => __awaiter(void 0, [_a], void 0, function* ({ name, description, owner, }) {
    const workspace = yield workspace_model_1.default.create({
        name,
        description,
        owner,
        members: [
            {
                user: owner,
                role: "owner",
            },
        ],
    });
    return workspace;
});
exports.createWorkspace = createWorkspace;
// GET WORKSPACE BY ID
const getWorkspaceById = (workspaceId) => __awaiter(void 0, void 0, void 0, function* () {
    const workspace = yield workspace_model_1.default.findById(workspaceId)
        .populate("owner")
        .populate("members.user");
    if (!workspace) {
        throw new Error("Workspace not found");
    }
    return workspace;
});
exports.getWorkspaceById = getWorkspaceById;
// GET USER WORKSPACES
const getUserWorkspaces = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const workspaces = yield workspace_model_1.default.find({
        "members.user": userId,
    })
        .populate("owner")
        .populate("members.user");
    return workspaces;
});
exports.getUserWorkspaces = getUserWorkspaces;
// UPDATE WORKSPACE
const updateWorkspace = (_a) => __awaiter(void 0, [_a], void 0, function* ({ workspaceId, name, description, }) {
    const workspace = yield workspace_model_1.default.findById(workspaceId);
    if (!workspace) {
        throw new Error("Workspace not found");
    }
    if (name) {
        workspace.name = name;
    }
    if (description) {
        workspace.description = description;
    }
    yield workspace.save();
    return workspace;
});
exports.updateWorkspace = updateWorkspace;
// ADD MEMBER
const addUserToWorkspace = (workspaceId, userId, inviterId) => __awaiter(void 0, void 0, void 0, function* () {
    const workspace = yield workspace_model_1.default.findById(workspaceId);
    if (!workspace) {
        throw new Error("Workspace not found");
    }
    const isMember = workspace.members.some((member) => member.user.toString() === userId);
    if (isMember) {
        throw new Error("User already exists");
    }
    workspace.members.push({
        user: new mongoose_1.default.Types.ObjectId(userId),
        role: "member",
    });
    yield workspace.save();
    yield (0, notification_service_1.createNotification)({
        recipient: userId,
        sender: inviterId || workspace.owner.toString(),
        type: "WORKSPACE_INVITE",
        title: "Workspace Invitation",
        message: `You have been added to the workspace: "${workspace.name}"`,
        link: `/workspaces/${workspace._id}`,
    });
    return workspace;
});
exports.addUserToWorkspace = addUserToWorkspace;
// REMOVE MEMBER
const removeUserFromWorkspace = (workspaceId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const workspace = yield workspace_model_1.default.findById(workspaceId);
    if (!workspace) {
        throw new Error("Workspace not found");
    }
    workspace.members = workspace.members.filter((member) => member.user.toString() !== userId);
    yield workspace.save();
    yield project_model_1.default.updateMany({
        workspace: workspaceId,
    }, {
        $pull: {
            members: userId,
        },
    });
    return workspace;
});
exports.removeUserFromWorkspace = removeUserFromWorkspace;
// CHANGE ROLE
const changeWorkspaceRole = (workspaceId, userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    const workspace = yield workspace_model_1.default.findById(workspaceId);
    if (!workspace) {
        throw new Error("Workspace not found");
    }
    const member = workspace.members.find((member) => member.user.toString() === userId);
    if (!member) {
        throw new Error("Member not found");
    }
    member.role = role;
    yield workspace.save();
    return workspace;
});
exports.changeWorkspaceRole = changeWorkspaceRole;
// LEAVE WORKSPACE
const leaveWorkspace = (workspaceId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const workspace = yield workspace_model_1.default.findById(workspaceId);
    if (!workspace) {
        throw new Error("Workspace not found");
    }
    if (workspace.owner.toString() === userId) {
        throw new Error("Owner cannot leave workspace");
    }
    workspace.members = workspace.members.filter((member) => member.user.toString() !== userId);
    yield workspace.save();
    return workspace;
});
exports.leaveWorkspace = leaveWorkspace;
// DELETE WORKSPACE
const deleteWorkspace = (workspaceId) => __awaiter(void 0, void 0, void 0, function* () {
    const workspace = yield workspace_model_1.default.findById(workspaceId);
    if (!workspace) {
        throw new Error("Workspace not found");
    }
    yield project_model_1.default.deleteMany({
        workspace: workspaceId,
    });
    yield workspace_model_1.default.findByIdAndDelete(workspaceId);
    return {
        message: "Workspace deleted successfully",
    };
});
exports.deleteWorkspace = deleteWorkspace;
