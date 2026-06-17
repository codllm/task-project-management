"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.loginUserSchema = exports.registerUserSchema = void 0;
const zod_1 = require("zod");
exports.registerUserSchema = zod_1.z.object({
    username: zod_1.z.object({
        firstname: zod_1.z
            .string()
            .min(2),
        lastname: zod_1.z
            .string()
            .min(2),
    }),
    email: zod_1.z
        .string()
        .email(),
    password: zod_1.z
        .string()
        .min(3),
    age: zod_1.z
        .number()
        .min(1),
    gender: zod_1.z.enum([
        "male",
        "female",
        "other",
    ]),
    usertype: zod_1.z.enum([
        "individual",
        "team",
        "admin",
    ]),
    phone: zod_1.z
        .string()
        .optional(),
});
exports.loginUserSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email(),
    password: zod_1.z
        .string()
        .min(3),
});
exports.updateUserSchema = zod_1.z.object({
    username: zod_1.z.object({
        firstname: zod_1.z
            .string()
            .optional(),
        lastname: zod_1.z
            .string()
            .optional(),
    }).optional(),
    age: zod_1.z
        .number()
        .optional(),
    gender: zod_1.z
        .string()
        .optional(),
    phone: zod_1.z
        .string()
        .optional(),
});
