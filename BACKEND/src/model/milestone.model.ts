import mongoose, { Schema, Document } from "mongoose";

export interface IMilestone extends Document {
  title: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  dueDate?: Date;
  status: "active" | "completed";
  tasks: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    tasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMilestone>("Milestone", milestoneSchema);
