"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const comment_controller_1 = require("../controllers/comment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/task/:taskId", auth_middleware_1.userauth, comment_controller_1.createCommentController);
router.get("/task/:taskId", auth_middleware_1.userauth, comment_controller_1.getTaskCommentsController);
router.delete("/:commentId", auth_middleware_1.userauth, comment_controller_1.deleteCommentController);
exports.default = router;
