import {
  Request,
  Response,
  NextFunction,
} from "express";

import { ZodObject } from "zod";

export const validate = (
  schema: AnyZodObject
) => {

  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    try {

      schema.parse(req.body);

      next();

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        errors: error.errors,
      });

    }

  };

};