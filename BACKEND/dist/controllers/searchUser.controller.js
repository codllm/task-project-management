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
exports.globalSearchController = exports.searchTasksController = exports.searchProjectsController = exports.searchWorkspacesController = exports.searchUsersController = void 0;
const searchUser_service_1 = require("../services/searchUser.service");
const searchUsersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = typeof req.query.q === "string"
            ? req.query.q
            : typeof req.params.query === "string"
                ? req.params.query
                : "";
        const searchResult = yield (0, searchUser_service_1.searchUsersService)(query);
        res.status(200).json({
            success: true,
            users: searchResult,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});
exports.searchUsersController = searchUsersController;
const searchWorkspacesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = typeof req.query.q === "string"
            ? req.query.q
            : typeof req.params.query === "string"
                ? req.params.query
                : "";
        const user = req.user;
        const searchResult = yield (0, searchUser_service_1.searchWorkspacesService)(query, user._id);
        res.status(200).json({
            success: true,
            workspaces: searchResult,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});
exports.searchWorkspacesController = searchWorkspacesController;
const searchProjectsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = typeof req.query.q === "string"
            ? req.query.q
            : typeof req.params.query === "string"
                ? req.params.query
                : "";
        const user = req.user;
        const searchResult = yield (0, searchUser_service_1.searchProjectsService)(query, user._id);
        res.status(200).json({
            success: true,
            projects: searchResult,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});
exports.searchProjectsController = searchProjectsController;
const searchTasksController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = typeof req.query.q === "string"
            ? req.query.q
            : typeof req.params.query === "string"
                ? req.params.query
                : "";
        const user = req.user;
        const searchResult = yield (0, searchUser_service_1.searchTasksService)(query, user._id);
        res.status(200).json({
            success: true,
            tasks: searchResult,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});
exports.searchTasksController = searchTasksController;
// Global Search Controller
const globalSearchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = typeof req.query.q === "string" ? req.query.q : "";
        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Query parameter 'q' is required",
            });
        }
        const user = req.user;
        const userId = user._id;
        const [users, workspaces, projects, tasks] = yield Promise.all([
            (0, searchUser_service_1.searchUsersService)(query),
            (0, searchUser_service_1.searchWorkspacesService)(query, userId),
            (0, searchUser_service_1.searchProjectsService)(query, userId),
            (0, searchUser_service_1.searchTasksService)(query, userId),
        ]);
        res.status(200).json({
            success: true,
            results: {
                users,
                workspaces,
                projects,
                tasks,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});
exports.globalSearchController = globalSearchController;
