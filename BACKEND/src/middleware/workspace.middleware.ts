// middleware/workspace.middleware.ts
import { Request, Response, NextFunction } from "express";
import Workspace from "../model/workspace.model";
import Project from "../model/project.model";

export const isWorkspaceAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  try {

    const user = (req as any).user;
    let workspaceId = req.params.workspaceId;

    // Support routes like deleteProject where workspaceId is not in parameters
    if (!workspaceId && req.params.projectId) {
      const project = await Project.findById(req.params.projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
      workspaceId = project.workspace.toString();
    }

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID is required",
      });
    }

    const workspace = await Workspace.findById(workspaceId);

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