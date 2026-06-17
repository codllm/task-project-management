import mongoose, { Schema, Document } from "mongoose";

export interface ISubtask {
  title: string;
  completed: boolean;
}

export interface IAttachment {
  name: string;
  url: string;
  publicId?: string;
  fileType: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface ITask extends Document {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date;
  project: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;

  // Advanced task management fields
  subtasks: ISubtask[];
  labels: string[];
  attachments: IAttachment[];
  dependencies: mongoose.Types.ObjectId[];
  recurring: {
    isRecurring: boolean;
    frequency: "daily" | "weekly" | "monthly" | "none";
    nextRun?: Date;
  };
  sprint?: mongoose.Types.ObjectId;
}

const taskSchema = new Schema<ITask>(
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
    status: {
      type: String,
      enum: ["todo", "in-progress", "completed"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: {
      type: Date,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Advanced features
    subtasks: [
      {
        title: { type: String, required: true, trim: true },
        completed: { type: Boolean, default: false },
      },
    ],
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        publicId: { type: String }, // Cloudinary public_id
        fileType: { type: String, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    dependencies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    recurring: {
      isRecurring: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "none"],
        default: "none",
      },
      nextRun: { type: Date },
    },
    sprint: {
      type: Schema.Types.ObjectId,
      ref: "Sprint",
    },
  },
  {
    timestamps: true,
  }
);

const TaskModel = mongoose.model<ITask>("Task", taskSchema);

export default TaskModel;