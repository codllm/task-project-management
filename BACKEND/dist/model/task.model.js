"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const taskSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        enum: ["todo", "in-progress", "completed"],
        default: "todo",
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
    },
    dueDate: {
        type: Date,
    },
    project: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
    },
    assignedTo: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User",
        }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    // Advanced features
    subtasks: [
        {
            title: { type: String, required: true, trim: true },
            completed: { type: Boolean, default: false },
        },
    ],
    labels: [
        {
            type: String,
            trim: true,
        },
    ],
    attachments: [
        {
            name: { type: String, required: true },
            url: { type: String, required: true },
            publicId: { type: String }, // Cloudinary public_id
            fileType: { type: String, required: true },
            uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
            createdAt: { type: Date, default: Date.now },
        },
    ],
    dependencies: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Task",
        },
    ],
    recurring: {
        isRecurring: { type: Boolean, default: false },
        frequency: {
            type: String,
            enum: ["daily", "weekly", "monthly", "none"],
            default: "none",
        },
        nextRun: { type: Date },
    },
    sprint: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Sprint",
    },
}, {
    timestamps: true,
});
const TaskModel = mongoose_1.default.model("Task", taskSchema);
exports.default = TaskModel;
