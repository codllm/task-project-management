
import Workspace from "../model/workspace.model";
import Project from "../model/project.model";
import mongoose from "mongoose";

interface CreateWorkspacePayload {
  name: string;
  description?: string;
  owner: string;
}


// CREATE WORKSPACE

export const createWorkspace = async ({
  name,
  description,
  owner,
}: CreateWorkspacePayload) => {

  const workspace = await Workspace.create({
    name,
    description,
    owner,

    members: [
      {
        user: owner,
        role: "owner",
      },
    ],
  });

  return workspace;
};


// GET WORKSPACE BY ID
export const getWorkspaceById = async (
  workspaceId: string
) => {

  const workspace = await Workspace.findById(workspaceId)
    .populate("owner")
    .populate("members.user");

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  return workspace;
};


// GET USER WORKSPACES

export const getUserWorkspaces = async (
  userId: string
) => {

  const workspaces = await Workspace.find({
    "members.user": userId,
  });

  return workspaces;
};


interface UpdateWorkspacePayload {
  workspaceId: string;
  name?: string;
  description?: string;
}


// UPDATE WORKSPACE

export const updateWorkspace = async ({
  workspaceId,
  name,
  description,
}: UpdateWorkspacePayload) => {

  const workspace = await Workspace.findById(
    workspaceId
  );

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  if (name) {
    workspace.name = name;
  }

  if (description) {
    workspace.description = description;
  }

  await workspace.save();

  return workspace;
};


// ADD MEMBER

export const addUserToWorkspace = async (
  workspaceId: string,
  userId: string
) => {

  const workspace = await Workspace.findById(
    workspaceId
  );

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const isMember = workspace.members.some(
    (member) =>
      member.user.toString() === userId
  );

  if (isMember) {
    throw new Error("User already exists");
  }

  workspace.members.push({
    user: new mongoose.Types.ObjectId(userId),
    role: "member",
  });

  await workspace.save();

  return workspace;
};


// REMOVE MEMBER

export const removeUserFromWorkspace = async (
  workspaceId: string,
  userId: string
) => {

  const workspace = await Workspace.findById(
    workspaceId
  );

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  workspace.members = workspace.members.filter(
    (member) =>
      member.user.toString() !== userId
  );

  await workspace.save();

  await Project.updateMany(
    {
      workspace: workspaceId,
    },
    {
      $pull: {
        members: userId,
      },
    }
  );

  return workspace;
};


// CHANGE ROLE

export const changeWorkspaceRole = async (
  workspaceId: string,
  userId: string,
  role: "admin" | "member"
) => {

  const workspace = await Workspace.findById(
    workspaceId
  );

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const member = workspace.members.find(
    (member) =>
      member.user.toString() === userId
  );

  if (!member) {
    throw new Error("Member not found");
  }

  member.role = role;

  await workspace.save();

  return workspace;
};


// LEAVE WORKSPACE

export const leaveWorkspace = async (
  workspaceId: string,
  userId: string
) => {

  const workspace = await Workspace.findById(
    workspaceId
  );

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  if (
    workspace.owner.toString() === userId
  ) {
    throw new Error(
      "Owner cannot leave workspace"
    );
  }

  workspace.members = workspace.members.filter(
    (member) =>
      member.user.toString() !== userId
  );

  await workspace.save();

  return workspace;
};


// DELETE WORKSPACE

export const deleteWorkspace = async (
  workspaceId: string
) => {

  const workspace = await Workspace.findById(
    workspaceId
  );

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  await Project.deleteMany({
    workspace: workspaceId,
  });

  await Workspace.findByIdAndDelete(
    workspaceId
  );

  return {
    message: "Workspace deleted successfully",
  };
};