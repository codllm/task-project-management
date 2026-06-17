import { z } from "zod";

export const registerUserSchema = z.object({

  username: z.object({

    firstname: z
      .string()
      .min(2),

    lastname: z
      .string()
      .min(2),

  }),

  email: z
    .string()
    .email(),

  password: z
    .string()
    .min(3),

  age: z
    .number()
    .min(1)
    .optional(),

  gender: z.enum([
    "male",
    "female",
    "other",
  ]),

  usertype: z.enum([
    "individual",
    "team",
    "admin",
  ]),

  phone: z
    .string()
    .min(3),

});

export const loginUserSchema = z.object({

  email: z
    .string()
    .email(),

  password: z
    .string()
    .min(3),

});

export const updateUserSchema = z.object({

  username: z.object({

    firstname: z
      .string()
      .optional(),

    lastname: z
      .string()
      .optional(),

  }).optional(),

  age: z
    .number()
    .optional(),

  gender: z
    .string()
    .optional(),

  phone: z
    .string()
    .optional(),

});