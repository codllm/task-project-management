"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignTaskSchema = exports.updateTaskStatusSchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(3),
    description: zod_1.z
        .string()
        .optional(),
    status: zod_1.z.enum([
        "todo",
        "in-progress",
        "completed",
    ]).optional(),
    priority: zod_1.z.enum([
        "low",
        "medium",
        "high",
    ]),
    dueDate: zod_1.z
        .string()
        .optional(),
    project: zod_1.z
        .string(),
    assignedTo: zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())])
        .optional(),
});
exports.updateTaskSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .optional(),
    description: zod_1.z
        .string()
        .optional(),
    priority: zod_1.z.enum([
        "low",
        "medium",
        "high",
    ]).optional(),
    dueDate: zod_1.z
        .string()
        .optional(),
    assignedTo: zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())])
        .optional(),
});
exports.updateTaskStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        "todo",
        "in-progress",
        "completed",
    ]),
});
exports.assignTaskSchema = zod_1.z.object({
    assignedTo: zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
});
