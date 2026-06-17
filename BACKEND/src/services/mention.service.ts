import UserModel from "../model/user.model";
import { createNotification } from "./notification.service";
import mongoose from "mongoose";

/**
 * Parse text for @name mentions, find matching users,
 * and create notifications if their preferences allow.
 */
export const parseAndNotifyMentions = async (
  text: string,
  senderId: string,
  task: any,
  isComment: boolean = false
) => {
  try {
    if (!text) return;

    // Matches @Name or @NameName (word characters)
    const matches = [...text.matchAll(/@(\w+)/g)].map((m) => m[1]);
    if (matches.length === 0) return;

    // Unique names
    const uniqueNames = Array.from(new Set(matches));

    for (const name of uniqueNames) {
      const queryOr: any[] = [
        { "username.firstname": { $regex: new RegExp("^" + name + "$", "i") } },
        { "username.lastname": { $regex: new RegExp("^" + name + "$", "i") } },
      ];

      if (name.includes("_")) {
        const parts = name.split("_");
        if (parts.length === 2) {
          queryOr.push({
            $and: [
              { "username.firstname": { $regex: new RegExp("^" + parts[0] + "$", "i") } },
              { "username.lastname": { $regex: new RegExp("^" + parts[1] + "$", "i") } },
            ],
          });
        }
      }

      const user = await UserModel.findOne({ $or: queryOr });

      if (!user) continue;

      const userId = user._id.toString();
      
      // Don't notify self
      if (userId === senderId.toString()) continue;

      // Check notification preferences
      const preferences = user.notificationPreferences;
      if (preferences && preferences.mentions === false) {
        continue;
      }

      // Fetch sender details
      const sender = await UserModel.findById(senderId);
      const senderName = sender
        ? `${sender.username.firstname} ${sender.username.lastname}`
        : "Someone";

      await createNotification({
        recipient: user._id,
        sender: new mongoose.Types.ObjectId(senderId),
        type: "TASK_UPDATED",
        title: "You were mentioned",
        message: isComment
          ? `${senderName} mentioned you in a comment on task "${task.title}".`
          : `${senderName} mentioned you in the task: "${task.title}".`,
        link: `/projects/${task.project}/tasks/${task._id}`,
      });
    }
  } catch (error) {
    console.error("Error parsing and notifying mentions:", error);
  }
};
