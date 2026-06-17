import { z } from "zod";

export const createProjectSchema = z.object({

  name: z
    .string()
    .min(3),

  description: z
    .string()
    .optional(),

  workspace: z
    .string(),

  deadline: z
    .string()
    .optional(),

  color: z
    .string()
    .optional(),

});

export const updateProjectSchema = z.object({

  name: z
    .string()
    .optional(),

  description: z
    .string()
    .optional(),

  status: z.enum([
    "ACTIVE",
    "COMPLETED",
    "ARCHIVED",
  ]).optional(),

});

export const addProjectMemberSchema = z.object({

  userId: z
    .string(),

  role: z.enum([
    "admin",
    "member",
  ]),

});