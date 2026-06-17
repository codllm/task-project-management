import { z } from "zod";

export const createWorkspaceSchema = z.object({

  name: z
    .string()
    .min(3),

  description: z
    .string()
    .optional(),

});

export const addWorkspaceMemberSchema = z.object({

  userId: z
    .string(),

  role: z.enum([
    "owner",
    "admin",
    "member",
  ]),

});

export const updateWorkspaceSchema = z.object({

  name: z
    .string()
    .optional(),

  description: z
    .string()
    .optional(),

  logoUrl: z
    .string()
    .optional(),

});