"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addProjectMemberSchema = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(3),
    description: zod_1.z
        .string()
        .optional(),
    workspace: zod_1.z
        .string(),
    deadline: zod_1.z
        .string()
        .optional(),
    color: zod_1.z
        .string()
        .optional(),
});
exports.updateProjectSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .optional(),
    description: zod_1.z
        .string()
        .optional(),
    status: zod_1.z.enum([
        "ACTIVE",
        "COMPLETED",
        "ARCHIVED",
    ]).optional(),
});
exports.addProjectMemberSchema = zod_1.z.object({
    userId: zod_1.z
        .string(),
    role: zod_1.z.enum([
        "admin",
        "member",
    ]),
});
