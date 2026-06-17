import { Request, Response } from "express";
import ProjectModel from "../model/project.model";
import TaskModel from "../model/task.model";
import WorkspaceModel from "../model/workspace.model";

export const getWorkspaceAnalytics = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Fetch projects in workspace
    const projects = await ProjectModel.find({ workspace: workspaceId });
    const projectIds = projects.map((p) => p._id);

    // Fetch all tasks for those projects
    const tasks = await TaskModel.find({
      project: { $in: projectIds },
      isArchived: { $ne: true },
    }).populate("assignedTo", "username email");

    // Calculate totals
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    
    const now = new Date();
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < now
    ).length;

    // Productivity aggregation
    const productivity: {
      [userId: string]: { name: string; email: string; completedCount: number; totalCount: number };
    } = {};

    const workspace = await WorkspaceModel.findById(workspaceId).populate(
      "members.user",
      "username email"
    );

    if (workspace) {
      for (const member of workspace.members) {
        const userObj = member.user as any;
        if (userObj) {
          const fullName = `${userObj.username?.firstname || ""} ${
            userObj.username?.lastname || ""
          }`.trim();
          productivity[userObj._id.toString()] = {
            name: fullName || userObj.email,
            email: userObj.email,
            completedCount: 0,
            totalCount: 0,
          };
        }
      }
    }

    for (const task of tasks) {
      if (task.assignedTo && Array.isArray(task.assignedTo)) {
        for (const assignee of task.assignedTo) {
          const assigneeId = (assignee as any)._id?.toString() || assignee.toString();
          if (productivity[assigneeId]) {
            productivity[assigneeId].totalCount++;
            if (task.status === "completed") {
              productivity[assigneeId].completedCount++;
            }
          }
        }
      }
    }

    const productivityList = Object.keys(productivity)
      .map((id) => ({
        userId: id,
        ...productivity[id],
      }))
      .sort((a, b) => b.completedCount - a.completedCount);

    // Project breakdown
    const projectBreakdown = projects.map((p) => {
      const projectTasks = tasks.filter((t) => t.project.toString() === p._id.toString());
      return {
        projectId: p._id,
        title: p.name,
        color: p.color || "#6C63FF",
        total: projectTasks.length,
        completed: projectTasks.filter((t) => t.status === "completed").length,
        inProgress: projectTasks.filter((t) => t.status === "in-progress").length,
        todo: projectTasks.filter((t) => t.status === "todo").length,
        overdue: projectTasks.filter(
          (t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < now
        ).length,
      };
    });

    const userIdStr = (req as any).user?._id?.toString() || "";
    const myTasks = tasks.filter(t => t.assignedTo && Array.isArray(t.assignedTo) && t.assignedTo.some((a: any) => (a._id?.toString() || a.toString()) === userIdStr));
    
    const myTotal = myTasks.length;
    const myCompleted = myTasks.filter(t => t.status === "completed").length;
    const myOverdue = myTasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < now).length;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const myCompletedThisWeek = myTasks.filter(t => t.status === "completed" && (t as any).updatedAt && new Date((t as any).updatedAt) >= oneWeekAgo).length;

    return res.status(200).json({
      success: true,
      analytics: {
        summary: {
          total,
          completed,
          inProgress,
          todo,
          overdue,
        },
        productivity: productivityList,
        projects: projectBreakdown,
        personal: {
          total: myTotal,
          completed: myCompleted,
          overdue: myOverdue,
          completedThisWeek: myCompletedThisWeek,
          completionRate: myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0
        }
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch workspace analytics",
    });
  }
};
