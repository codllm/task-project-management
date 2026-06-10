import { Request, Response } from "express";
import {
  searchUsersService,
  searchWorkspacesService,
  searchProjectsService,
  searchTasksService,
} from "../services/searchUser.service";

export const searchUsersController = async (req: Request, res: Response) => {
  try {
    const query =
      typeof req.query.q === "string"
        ? req.query.q
        : typeof req.params.query === "string"
        ? req.params.query
        : "";

    const searchResult = await searchUsersService(query);

    res.status(200).json({
      success: true,
      users: searchResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const searchWorkspacesController = async (
  req: Request,
  res: Response
) => {
  try {
    const query =
      typeof req.query.q === "string"
        ? req.query.q
        : typeof req.params.query === "string"
        ? req.params.query
        : "";

    const user = (req as any).user;

    const searchResult = await searchWorkspacesService(query, user._id);

    res.status(200).json({
      success: true,
      workspaces: searchResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const searchProjectsController = async (
  req: Request,
  res: Response
) => {
  try {
    const query =
      typeof req.query.q === "string"
        ? req.query.q
        : typeof req.params.query === "string"
        ? req.params.query
        : "";

    const user = (req as any).user;

    const searchResult = await searchProjectsService(query, user._id);

    res.status(200).json({
      success: true,
      projects: searchResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const searchTasksController = async (
  req: Request,
  res: Response
) => {
  try {
    const query =
      typeof req.query.q === "string"
        ? req.query.q
        : typeof req.params.query === "string"
        ? req.params.query
        : "";

    const user = (req as any).user;

    const searchResult = await searchTasksService(query, user._id);

    res.status(200).json({
      success: true,
      tasks: searchResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Global Search Controller
export const globalSearchController = async (
  req: Request,
  res: Response
) => {
  try {
    const query =
      typeof req.query.q === "string" ? req.query.q : "";

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query parameter 'q' is required",
      });
    }

    const user = (req as any).user;
    const userId = user._id;

    const [users, workspaces, projects, tasks] = await Promise.all([
      searchUsersService(query),
      searchWorkspacesService(query, userId),
      searchProjectsService(query, userId),
      searchTasksService(query, userId),
    ]);

    res.status(200).json({
      success: true,
      results: {
        users,
        workspaces,
        projects,
        tasks,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};