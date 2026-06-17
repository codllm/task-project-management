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

export const blockViewers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = user._id.toString();
    let { workspaceId, projectId, taskId, commentId } = req.params;

    // Fallback to request body for creation routes
    if (!projectId && req.body.project) {
      projectId = req.body.project;
    }
    if (!workspaceId && req.body.workspace) {
      workspaceId = req.body.workspace;
    }

    if (commentId) {
      const Comment = require("../model/comment.model").default;
      const comment = await Comment.findById(commentId).populate("task");
      if (comment && comment.task) {
        taskId = (comment.task as any)._id.toString();
      }
    }

    if (taskId) {
      const Task = require("../model/task.model").default;
      const task = await Task.findById(taskId);
      if (task) {
        projectId = task.project.toString();
      }
    }

    if (projectId) {
      const Project = require("../model/project.model").default;
      const project = await Project.findById(projectId);
      if (project) {
        const projectMember = project.members.find(
          (m: any) => m.user.toString() === userId
        );
        if (projectMember && projectMember.role === "viewer") {
          return res.status(403).json({
            success: false,
            message: "Action forbidden: View-only role",
          });
        }
        workspaceId = project.workspace.toString();
      }
    }

    if (workspaceId) {
      const Workspace = require("../model/workspace.model").default;
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        const workspaceMember = workspace.members.find(
          (m: any) => m.user.toString() === userId
        );
        if (workspaceMember && workspaceMember.role === "viewer") {
          return res.status(403).json({
            success: false,
            message: "Action forbidden: View-only role in workspace",
          });
        }
      }
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check viewer permissions",
    });
  }
};