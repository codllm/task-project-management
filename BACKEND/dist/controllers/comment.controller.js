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
exports.deleteCommentController = exports.getTaskCommentsController = exports.createCommentController = void 0;
const comment_service_1 = require("../services/comment.service");
const createCommentController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content } = req.body;
        const taskId = req.params.taskId;
        const userId = req.user._id;
        const comment = yield (0, comment_service_1.createCommentService)(content, taskId, userId);
        return res.status(201).json({
            success: true,
            comment,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create comment",
        });
    }
});
exports.createCommentController = createCommentController;
const getTaskCommentsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = req.params.taskId;
        const comments = yield (0, comment_service_1.getTaskCommentsService)(taskId);
        return res.status(200).json({
            success: true,
            comments,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch comments",
        });
    }
});
exports.getTaskCommentsController = getTaskCommentsController;
const deleteCommentController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const commentId = req.params.commentId;
        yield (0, comment_service_1.deleteCommentService)(commentId);
        return res.status(200).json({
            success: true,
            message: "Comment deleted",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete comment",
        });
    }
});
exports.deleteCommentController = deleteCommentController;
