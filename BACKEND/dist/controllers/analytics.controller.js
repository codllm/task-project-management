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
exports.getProjectAnalyticsController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const task_model_1 = __importDefault(require("../model/task.model"));
const getProjectAnalyticsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = typeof req.params.projectId === "string"
            ? req.params.projectId
            : "";
        if (!mongoose_1.default.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Project ID",
            });
        }
        const analytics = yield task_model_1.default.aggregate([
            {
                $match: {
                    project: new mongoose_1.default.Types.ObjectId(projectId),
                },
            },
            {
                $group: {
                    _id: "$status",
                    count: {
                        $sum: 1,
                    },
                },
            },
        ]);
        const result = {
            todo: 0,
            "in-progress": 0,
            completed: 0,
        };
        analytics.forEach((item) => {
            if (item._id === "todo" ||
                item._id === "in-progress" ||
                item._id === "completed") {
                result[item._id] = item.count;
            }
        });
        res.status(200).json({
            success: true,
            analytics: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.getProjectAnalyticsController = getProjectAnalyticsController;
