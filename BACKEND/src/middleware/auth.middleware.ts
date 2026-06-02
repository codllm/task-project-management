import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import userModel from "../model/user.model";
import dotenv from "dotenv";

dotenv.config();

export const userauth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    // 1. Get token from cookie OR header
    let token: string | undefined;

    // From cookies
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // From Authorization header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. If no token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided",
      });
    }

    // 3. Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY as string
    ) as jwt.JwtPayload;

    // 4. Find user
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // 5. Attach user to request
    (req as any).user = user;

    // 6. Go to next middleware/controller
    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });

  }
};