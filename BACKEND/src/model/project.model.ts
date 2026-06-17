// models/project.model.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IProjectMember {
  user: mongoose.Types.ObjectId;
  role: "admin" | "member" | "viewer";
}

export interface IProjectColumn {
  id: string;
  label: string;
  color: string;
}

export interface IProjectCustomField {
  name: string;
  type: "text" | "number" | "date" | "boolean";
  required: boolean;
}

export interface IProject extends Document {
  name: string;

  description?: string;

  workspace: mongoose.Types.ObjectId;

  members: IProjectMember[];

  createdBy: mongoose.Types.ObjectId;

  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";

  deadline?: Date;

  color?: string;

  coverImageUrl?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  columns: IProjectColumn[];
  customFields: IProjectCustomField[];
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

    color: {
      type: String,
      default: "#6C63FF",
    },

    coverImageUrl: {
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
          enum: ["admin", "member", "viewer"],
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
    columns: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          color: { type: String, default: "#6C63FF" }
        }
      ],
      default: [
        { id: "todo", label: "To Do", color: "#A8ACB9" },
        { id: "in-progress", label: "In Progress", color: "#EF9F27" },
        { id: "completed", label: "Completed", color: "#5DCAA5" }
      ]
    },
    customFields: {
      type: [
        {
          name: { type: String, required: true },
          type: { type: String, enum: ["text", "number", "date", "boolean"], default: "text" },
          required: { type: Boolean, default: false }
        }
      ],
      default: []
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
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