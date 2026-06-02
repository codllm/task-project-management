// models/project.model.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IProjectMember {
  user: mongoose.Types.ObjectId;
  role: "admin" | "member";
}

export interface IProject extends Document {
  name: string;

  description?: string;

  workspace: mongoose.Types.ObjectId;

  members: IProjectMember[];

  createdBy: mongoose.Types.ObjectId;

  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";

  deadline?: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
    },

    description: {
      type: String,
    },

    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
      },
    ],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "ARCHIVED"],
      default: "ACTIVE",
    },

    deadline: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IProject>(
  "Project",
  projectSchema
);