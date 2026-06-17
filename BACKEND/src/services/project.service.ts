// services/project.service.ts

import mongoose from "mongoose";

import Project from "../model/project.model";
import Workspace from "../model/workspace.model";
import { createNotification } from "./notification.service";


// CREATE PROJECT

interface CreateProjectPayload {
  name: string;
  description?: string;
  workspace: string;
  createdBy: string;
  deadline?: Date;
  color?: string;
}

export const createProject = async ({
  name,
  description,
  workspace,
  createdBy,
  deadline,
  color,
}: CreateProjectPayload) => {

  const workspaceExists = await Workspace.findById(
    workspace
  );

  if (!workspaceExists) {
    throw new Error("Workspace not found");
  }

  const project = await Project.create({
    name,
    description,
    workspace,
    createdBy,
    deadline,
    color,

    members: [
      {
        user: createdBy,
        role: "admin",
      },
    ],
  });

  const otherMembers = workspaceExists.members.filter(
    (m) => {
      const memberUserId = (m && typeof m === "object" && m.user) ? m.user.toString() : (m ? m.toString() : "");
      return memberUserId !== createdBy.toString() && memberUserId !== "";
    }
  );

  for (const member of otherMembers) {
    const memberUserId = (member && typeof member === "object" && member.user) ? member.user.toString() : member.toString();
    await createNotification({
      recipient: memberUserId,
      sender: createdBy.toString(),
      type: "PROJECT_ADDED",
      title: "New Project Added",
      message: `A new project "${project.name}" was added to workspace "${workspaceExists.name}"`,
      link: `/projects/${project._id}`,
    });
  }

  return project;
};


// GET PROJECT BY ID

export const getProjectById = async (
  projectId: string
) => {

  const project = await Project.findById(projectId)
    .populate("workspace")
    .populate("members.user")
    .populate("createdBy");

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
};


// GET WORKSPACE PROJECTS

export const getWorkspaceProjects = async (
  workspaceId: string
) => {

  const projects = await Project.find({
    workspace: workspaceId,
  }).populate("members.user");

  return projects;
};


// UPDATE PROJECT

interface UpdateProjectPayload {
  projectId: string;
  name?: string;
  description?: string;
  status?: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  deadline?: Date;
}

export const updateProject = async ({
  projectId,
  name,
  description,
  status,
  deadline,
}: UpdateProjectPayload) => {

  const project = await Project.findById(
    projectId
  );

  if (!project) {
    throw new Error("Project not found");
  }

  if (name) {
    project.name = name;
  }

  if (description) {
    project.description = description;
  }

  if (status) {
    project.status = status;
  }

  if (deadline) {
    project.deadline = deadline;
  }

  await project.save();

  return project;
};


// DELETE PROJECT

export const deleteProject = async (
  projectId: string
) => {

  const project = await Project.findById(
    projectId
  );

  if (!project) {
    throw new Error("Project not found");
  }

  await Project.findByIdAndDelete(
    projectId
  );

  return {
    message: "Project deleted successfully",
  };
};


// ADD MEMBER TO PROJECT

export const addMemberToProject = async (
  projectId: string,
  userId: string
) => {

  const project = await Project.findById(
    projectId
  );

  if (!project) {
    throw new Error("Project not found");
  }

  const workspace = await Workspace.findById(
    project.workspace
  );

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const isWorkspaceMember =
    workspace.members.some(
      (member) =>
        member.user.toString() === userId
    );

  if (!isWorkspaceMember) {
    throw new Error(
      "User is not member of workspace"
    );
  }

  const isProjectMember =
    project.members.some(
      (member) =>
        member.user.toString() === userId
    );

  if (isProjectMember) {
    throw new Error(
      "User already exists in project"
    );
  }

  project.members.push({
    user: new mongoose.Types.ObjectId(
      userId
    ),
    role: "member",
  });

  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate("workspace")
    .populate("members.user")
    .populate("createdBy");

  return populatedProject;
};


// REMOVE MEMBER FROM PROJECT

export const removeMemberFromProject = async (
  projectId: string,
  userId: string
) => {

  const project = await Project.findById(
    projectId
  );

  if (!project) {
    throw new Error("Project not found");
  }

  project.members = project.members.filter(
    (member) =>
      member.user.toString() !== userId
  );

  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate("workspace")
    .populate("members.user")
    .populate("createdBy");

  return populatedProject;
};


// CHANGE PROJECT ROLE

export const changeProjectRole = async (
  projectId: string,
  userId: string,
  role: "admin" | "member"
) => {

  const project = await Project.findById(
    projectId
  );

  if (!project) {
    throw new Error("Project not found");
  }

  const member = project.members.find(
    (member) =>
      member.user.toString() === userId
  );

  if (!member) {
    throw new Error("Member not found");
  }

  member.role = role;

  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate("workspace")
    .populate("members.user")
    .populate("createdBy");

  return populatedProject;
};


// GET PROJECT MEMBERS

export const getProjectMembers = async (
  projectId: string
) => {

  const project = await Project.findById(
    projectId
  ).populate("members.user");

  if (!project) {
    throw new Error("Project not found");
  }

  return project.members;
};