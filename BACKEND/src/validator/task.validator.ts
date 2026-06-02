import { z } from "zod";

export const createTaskSchema = z.object({

  title: z
    .string()
    .min(3),

  description: z
    .string()
    .optional(),

  status: z.enum([
    "todo",
    "in-progress",
    "completed",
  ]).optional(),

  priority: z.enum([
    "low",
    "medium",
    "high",
  ]),

  dueDate: z
    .string()
    .optional(),

  project: z
    .string(),

  assignedTo: z
    .string()
    .optional(),

});

export const updateTaskSchema = z.object({

  title: z
    .string()
    .optional(),

  description: z
    .string()
    .optional(),

  priority: z.enum([
    "low",
    "medium",
    "high",
  ]).optional(),

  dueDate: z
    .string()
    .optional(),

});

export const updateTaskStatusSchema = z.object({

  status: z.enum([
    "todo",
    "in-progress",
    "completed",
  ]),

});

export const assignTaskSchema = z.object({

  assignedTo: z
    .string(),

});