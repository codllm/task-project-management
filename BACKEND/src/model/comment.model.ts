import mongoose, { Schema, Document } from "mongoose";

export interface ICommentReaction {
  user: mongoose.Types.ObjectId;
  emoji: string;
}

export interface IComment extends Document {
  content: string;
  task: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  reactions: ICommentReaction[];
}

const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },

    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reactions: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const CommentModel = mongoose.model<IComment>(
  "Comment",
  commentSchema
);

export default CommentModel;