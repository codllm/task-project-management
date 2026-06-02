// controllers/workspace.controller.ts

import { Request, Response } from "express";

import {
  createWorkspace,
  getWorkspaceById,
  getUserWorkspaces,
  updateWorkspace,
  addUserToWorkspace,
  removeUserFromWorkspace,
  leaveWorkspace,
  deleteWorkspace,
  changeWorkspaceRole,
} from "../services/workspace.service";


// CREATE WORKSPACE

export const createWorkspaceController = async (
  req: Request,
  res: Response
) => {

  try {

    const user = (req as any).user;

    const workspace = await createWorkspace({
      ...req.body,
      owner: user._id as string,
    });

    res.status(201).json({
      success: true,
      workspace,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// GET WORKSPACE BY ID

export const getWorkspaceByIdController = async (
  req: Request,
  res: Response
) => {

  try {

    const workspace = await getWorkspaceById(
      req.params.workspaceId as string
    );

    res.status(200).json({
      success: true,
      workspace,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// GET USER WORKSPACES

export const getUserWorkspacesController = async (
  req: Request,
  res: Response
) => {

  try {

    const workspaces = await getUserWorkspaces(
      req.params.userId as string
    );

    res.status(200).json({
      success: true,
      workspaces,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// UPDATE WORKSPACE

export const updateWorkspaceController = async (
  req: Request,
  res: Response
) => {

  try {

    const workspace = await updateWorkspace({
      workspaceId: req.params.workspaceId,
      ...req.body,
    });

    res.status(200).json({
      success: true,
      workspace,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ADD MEMBER

export const addUserToWorkspaceController = async (
  req: Request,
  res: Response
) => {

  try {

    const workspace = await addUserToWorkspace(
      req.params.workspaceId as string,
      req.body.userId
    );

    res.status(200).json({
      success: true,
      workspace,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// REMOVE MEMBER

export const removeUserFromWorkspaceController = async (
  req: Request,
  res: Response
) => {

  try {

    const workspace = await removeUserFromWorkspace(
      req.params.workspaceId as string,
      req.body.userId
    );

    res.status(200).json({
      success: true,
      workspace,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// CHANGE ROLE

export const changeWorkspaceRoleController = async (
  req: Request,
  res: Response
) => {

  try {

    const workspace = await changeWorkspaceRole(
      req.params.workspaceId as string,
      req.body.userId,
      req.body.role
    );

    res.status(200).json({
      success: true,
      workspace,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// LEAVE WORKSPACE

export const leaveWorkspaceController = async (
  req: Request,
  res: Response
) => {

  try {

    const user = (req as any).user;

    const workspace = await leaveWorkspace(
      req.params.workspaceId as string,
      user._id
    );

    res.status(200).json({
      success: true,
      workspace,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// DELETE WORKSPACE

export const deleteWorkspaceController = async (
  req: Request,
  res: Response
) => {

  try {

    const result = await deleteWorkspace(
      req.params.workspaceId as string
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