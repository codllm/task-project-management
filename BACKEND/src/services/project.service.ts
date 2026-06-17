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
  coverImageUrl?: string;
}

export const createProject = async ({
  name,
  description,
  workspace,
  createdBy,
  deadline,
  color,
  coverImageUrl,
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
    coverImageUrl,

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

  if (!project || project.isDeleted) {
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
    isDeleted: { $ne: true },
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
  coverImageUrl?: string;
}

export const updateProject = async ({
  projectId,
  name,
  description,
  status,
  deadline,
  coverImageUrl,
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

  if (coverImageUrl !== undefined) {
    project.coverImageUrl = coverImageUrl;
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

  project.isDeleted = true;
  project.deletedAt = new Date();
  await project.save();

  // Cascade soft-delete to project tasks
  await mongoose.model("Task").updateMany(
    { project: projectId },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  return {
    message: "Project soft-deleted successfully",
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

// GET TRASH PROJECTS
export const getTrashProjectsService = async (workspaceId: string) => {
  const projects = await Project.find({
    workspace: workspaceId,
    isDeleted: true,
  }).populate("members.user");

  return projects;
};

// RESTORE PROJECT
export const restoreProjectService = async (projectId: string) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  project.isDeleted = false;
  project.deletedAt = undefined;
  await project.save();

  // Cascade restore to tasks
  await mongoose.model("Task").updateMany(
    { project: projectId },
    { $set: { isDeleted: false, deletedAt: undefined } }
  );

  const populatedProject = await Project.findById(project._id)
    .populate("workspace")
    .populate("members.user")
    .populate("createdBy");

  return populatedProject;
};

// DELETE PROJECT PERMANENTLY
export const deleteProjectPermanentlyService = async (projectId: string) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  await Project.findByIdAndDelete(projectId);

  // Permanently delete task documents in this project
  await mongoose.model("Task").deleteMany({ project: projectId });

  return project;
};

// UPDATE PROJECT COLUMNS
export const updateProjectColumns = async (projectId: string, columns: any[]) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  if (!Array.isArray(columns)) {
    throw new Error("Columns must be an array");
  }

  for (const col of columns) {
    if (!col.id || !col.label) {
      throw new Error("Each column must have an id and a label");
    }
  }

  project.columns = columns;
  await project.save();

  return Project.findById(projectId)
    .populate("workspace")
    .populate("members.user")
    .populate("createdBy");
};

// UPDATE PROJECT CUSTOM FIELDS
export const updateProjectCustomFields = async (projectId: string, customFields: any[]) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  if (!Array.isArray(customFields)) {
    throw new Error("Custom fields must be an array");
  }

  for (const field of customFields) {
    if (!field.name || !field.type) {
      throw new Error("Each custom field must have a name and a type");
    }
    if (!["text", "number", "date", "boolean"].includes(field.type)) {
      throw new Error(`Invalid custom field type: ${field.type}`);
    }
  }

  project.customFields = customFields;
  await project.save();

  return Project.findById(projectId)
    .populate("workspace")
    .populate("members.user")
    .populate("createdBy");
};