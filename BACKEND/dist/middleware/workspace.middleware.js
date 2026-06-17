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
exports.isWorkspaceAdmin = void 0;
const workspace_model_1 = __importDefault(require("../model/workspace.model"));
const project_model_1 = __importDefault(require("../model/project.model"));
const isWorkspaceAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        let workspaceId = req.params.workspaceId;
        // Support routes like deleteProject where workspaceId is not in parameters
        if (!workspaceId && req.params.projectId) {
            const project = yield project_model_1.default.findById(req.params.projectId);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found",
                });
            }
            workspaceId = project.workspace.toString();
        }
        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "Workspace ID is required",
            });
        }
        const workspace = yield workspace_model_1.default.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({
                success: false,
                message: "Workspace not found",
            });
        }
        const member = workspace.members.find((member) => member.user.toString() ===
            user._id.toString());
        if (!member) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        if (member.role !== "owner" &&
            member.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only owner/admin allowed",
            });
        }
        next();
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.isWorkspaceAdmin = isWorkspaceAdmin;
