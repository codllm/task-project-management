// middleware/workspace.middleware.ts
import { Request, Response, NextFunction } from "express";
import Workspace from "../model/workspace.model";

export const isWorkspaceAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  try {

    const user = (req as any).user;

    const workspace = await Workspace.findById(
      req.params.workspaceId
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const member = workspace.members.find(
      (member) =>
        member.user.toString() ===
        user._id.toString()
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (
      member.role !== "owner" &&
      member.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only owner/admin allowed",
      });
    }

    next();

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};