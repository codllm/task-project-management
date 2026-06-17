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
exports.searchTasksService = exports.searchProjectsService = exports.searchWorkspacesService = exports.searchUsersService = void 0;
const user_model_1 = __importDefault(require("../model/user.model"));
const project_model_1 = __importDefault(require("../model/project.model"));
const workspace_model_1 = __importDefault(require("../model/workspace.model"));
const task_model_1 = __importDefault(require("../model/task.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const searchUsersService = (query) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield user_model_1.default
            .find({
            $or: [
                { email: { $regex: query, $options: "i" } },
                { "username.firstname": { $regex: query, $options: "i" } },
                { "username.lastname": { $regex: query, $options: "i" } },
            ],
        })
            .select("username email profilePic")
            .limit(15);
    }
    catch (error) {
        console.error("Error searching for users:", error);
        throw new Error("Failed to search for users");
    }
});
exports.searchUsersService = searchUsersService;
const searchWorkspacesService = (query, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield workspace_model_1.default
            .find({
            name: { $regex: query, $options: "i" },
            "members.user": new mongoose_1.default.Types.ObjectId(userId),
        })
            .select("name description")
            .limit(10);
    }
    catch (error) {
        console.error("Error searching for workspaces:", error);
        throw new Error("Failed to search for workspaces");
    }
});
exports.searchWorkspacesService = searchWorkspacesService;
const searchProjectsService = (query, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield project_model_1.default
            .find({
            name: { $regex: query, $options: "i" },
            "members.user": new mongoose_1.default.Types.ObjectId(userId),
        })
            .select("name status deadline workspace")
            .populate("workspace", "name")
            .limit(10);
    }
    catch (error) {
        console.error("Error searching for projects:", error);
        throw new Error("Failed to search for projects");
    }
});
exports.searchProjectsService = searchProjectsService;
const searchTasksService = (query, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // A user can search tasks if they are assigned to it, OR if they are a member of the project it belongs to.
        // First, find all projects the user is a member of.
        const userProjects = yield project_model_1.default.find({ "members.user": new mongoose_1.default.Types.ObjectId(userId) }).select("_id");
        const projectIds = userProjects.map((p) => p._id);
        return yield task_model_1.default.find({
            title: { $regex: query, $options: "i" },
            $or: [
                { project: { $in: projectIds } },
                { assignedTo: new mongoose_1.default.Types.ObjectId(userId) },
            ],
        })
            .select("title status priority project")
            .populate("project", "name")
            .limit(15);
    }
    catch (error) {
        console.error("Error searching for tasks:", error);
        throw new Error("Failed to search for tasks");
    }
});
exports.searchTasksService = searchTasksService;
