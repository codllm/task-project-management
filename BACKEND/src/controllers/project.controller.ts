import { Request, Response } from "express";

import {
  createProject,
  getProjectById,
  getWorkspaceProjects,
  updateProject,
  deleteProject,
  addMemberToProject,
  removeMemberFromProject,
  getProjectMembers,
  changeProjectRole,
  getTrashProjectsService,
  restoreProjectService,
  deleteProjectPermanentlyService,
  updateProjectColumns,
  updateProjectCustomFields,
} from "../services/project.service";


// CREATE PROJECT

export const createProjectController = async (
  req: Request,
  res: Response
) => {

  try {

    const user = (req as any).user;

    const project = await createProject({
      ...req.body,
      createdBy: user._id,
    });

    res.status(201).json({
      success: true,
      project,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// GET PROJECT BY ID

export const getProjectByIdController = async (
  req: Request,
  res: Response
) => {

  try {

    const project = await getProjectById(
      req.params.projectId as string
    );

    res.status(200).json({
      success: true,
      project,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// GET WORKSPACE PROJECTS

export const getWorkspaceProjectsController = async (
  req: Request,
  res: Response
) => {

  try {

    const projects = await getWorkspaceProjects(
      req.params.workspaceId as string
    );

    res.status(200).json({
      success: true,
      projects,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// UPDATE PROJECT

export const updateProjectController = async (
  req: Request,
  res: Response
) => {

  try {

    const project = await updateProject({
      projectId: req.params.projectId,
      ...req.body,
    });

    res.status(200).json({
      success: true,
      project,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// DELETE PROJECT

export const deleteProjectController = async (
  req: Request,
  res: Response
) => {

  try {

    const result = await deleteProject(
      req.params.projectId as string
    );

    res.status(200).json({
      success: true,
      result,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ADD MEMBER TO PROJECT

export const addMemberToProjectController = async (
  req: Request,
  res: Response
) => {

  try {

    const project = await addMemberToProject(
      req.params.projectId as string,
      req.body.userId
    );

    res.status(200).json({
      success: true,
      project,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// REMOVE MEMBER FROM PROJECT

export const removeMemberFromProjectController = async (
  req: Request,
  res: Response
) => {

  try {

    const project = await removeMemberFromProject(
      req.params.projectId as string,
      req.body.userId
    );

    res.status(200).json({
      success: true,
      project,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// CHANGE PROJECT ROLE

export const changeProjectRoleController = async (
  req: Request,
  res: Response
) => {

  try {

    const project = await changeProjectRole(
      req.params.projectId as string,
      req.body.userId,
      req.body.role
    );

    res.status(200).json({
      success: true,
      project,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// GET PROJECT MEMBERS

export const getProjectMembersController = async (
  req: Request,
  res: Response
) => {

  try {

    const members = await getProjectMembers(
      req.params.projectId as string
    );

    res.status(200).json({
      success: true,
      members,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

export const getTrashProjectsController = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const projects = await getTrashProjectsService(workspaceId);
    return res.status(200).json({ success: true, projects });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch trash projects" });
  }
};

export const restoreProjectController = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const project = await restoreProjectService(projectId);
    return res.status(200).json({ success: true, project });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to restore project" });
  }
};

export const deleteProjectPermanentlyController = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    await deleteProjectPermanentlyService(projectId);
    return res.status(200).json({ success: true, message: "Project permanently deleted" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to permanently delete project" });
  }
};

export const updateProjectColumnsController = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const { columns } = req.body;
    const project = await updateProjectColumns(projectId, columns);
    return res.status(200).json({ success: true, project });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to update project columns" });
  }
};

export const updateProjectCustomFieldsController = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const { customFields } = req.body;
    const project = await updateProjectCustomFields(projectId, customFields);
    return res.status(200).json({ success: true, project });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to update project custom fields" });
  }
};