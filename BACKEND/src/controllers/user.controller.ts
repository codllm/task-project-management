import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { createUser,updateUser,forgetPassword } from "../services/user.service"; // Named import
import usermodel from "../model/user.model";
import { success } from "zod";
import cloudinary from "../config/cloudinary";
import fs from "fs";

export const signup = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    username: { firstname, lastname },
    email,
    password,
    gender,
    usertype,
    phone
  } = req.body;

  try {

    const newUser = await createUser({ firstname, lastname, email, password, gender,usertype,phone });
    
    const token = newUser.generateToken();

    console.log("New user created:", newUser); // Debugging log
    return res.status(201).json({success:true, user: newUser, token });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;

  const user = await usermodel.findOne({ email });

if (!user) {
  return res.status(401).json({
    message: "Invalid credentials"
  });
}

const passwordMatch = await user.comparePassword(password);
console.log("Password Match:", passwordMatch);
  if(!passwordMatch){
    return res.status(401).json({ message: "Incorrect Password" });
  }
  //match found, generate token now
  const token = user.generateToken();
  return res.status(200).json({ success: true, user, token });
};

export const profile = async (req:Request, res:Response) => {
  try {
    return res.status(200).json({
      user: (req as any).user,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, phone } = req.body;

  try {
    const updatedUser = await updateUser({ email, phone });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user: updatedUser });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}

export const forgetPass = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email,newPassword } = req.body;
  // Implment password reset logic here (e.g., send reset email)
  const userforget = await forgetPassword(email,newPassword); // Example new password, replace with actual logic
  return res.status(200).json({ message: `Password reset link sent to ${email}` });
}
export const logout = async (req: Request, res: Response) => {

  const token = req.headers.authorization?.split(" ")[1]; // Extract token from header
  if (!token) {
    return res.status(400).json({ message: "Token is required for logout" });
  }
  console.log("Logout token:", token); // Debugging log
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { comments, assignments, mentions, reminders } = req.body;

    const user = await usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.notificationPreferences = {
      comments: comments !== undefined ? comments : (user.notificationPreferences?.comments ?? true),
      assignments: assignments !== undefined ? assignments : (user.notificationPreferences?.assignments ?? true),
      mentions: mentions !== undefined ? mentions : (user.notificationPreferences?.mentions ?? true),
      reminders: reminders !== undefined ? reminders : (user.notificationPreferences?.reminders ?? true),
    };

    await user.save();

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update notification preferences",
    });
  }
};

export const togglePinProjectController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { projectId } = req.params;

    const user = await usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.pinnedProjects) {
      user.pinnedProjects = [];
    }

    const index = user.pinnedProjects.indexOf(projectId as any);
    if (index > -1) {
      user.pinnedProjects.splice(index, 1);
    } else {
      user.pinnedProjects.push(projectId as any);
    }

    await user.save();
    return res.status(200).json({ success: true, pinnedProjects: user.pinnedProjects });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to toggle pin project" });
  }
};

export const togglePinTaskController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { taskId } = req.params;

    const user = await usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.pinnedTasks) {
      user.pinnedTasks = [];
    }

    const index = user.pinnedTasks.indexOf(taskId as any);
    if (index > -1) {
      user.pinnedTasks.splice(index, 1);
    } else {
      user.pinnedTasks.push(taskId as any);
    }

    await user.save();
    return res.status(200).json({ success: true, pinnedTasks: user.pinnedTasks });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to toggle pin task" });
  }
};

export const getPinnedItemsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const user = await usermodel.findById(userId)
      .populate({
        path: "pinnedProjects",
        match: { isDeleted: { $ne: true } }
      })
      .populate({
        path: "pinnedTasks",
        match: { isDeleted: { $ne: true } },
        populate: [
          { path: "assignedTo", select: "username email" },
          { path: "createdBy", select: "username email" }
        ]
      });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      pinnedProjects: user.pinnedProjects || [],
      pinnedTasks: user.pinnedTasks || [],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch pinned items" });
  }
};

export const updateAvatarController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "user-avatars",
      resource_type: "image",
    });

    // Remove local temp file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Failed to delete local temp avatar file:", err);
    });

    // Update user avatarUrl in database
    const user = await usermodel.findByIdAndUpdate(
      userId,
      { avatarUrl: result.secure_url },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        pinnedProjects: user.pinnedProjects,
        pinnedTasks: user.pinnedTasks,
        notificationPreferences: user.notificationPreferences
      }
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({ success: false, message: error.message || "Failed to update avatar" });
  }
};

export const saveFilterController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { projectId, filterName, query } = req.body;

    if (!projectId || !filterName || !query) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const user = await usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.savedFilters) user.savedFilters = [];
    user.savedFilters.push({
      name: filterName,
      project: projectId,
      query
    } as any);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Filter saved successfully",
      savedFilters: user.savedFilters
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to save filter" });
  }
};

export const getSavedFiltersController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const user = await usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const filters = (user.savedFilters || []).filter(f => f.project.toString() === projectId);

    return res.status(200).json({
      success: true,
      savedFilters: filters
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch saved filters" });
  }
};

export const deleteSavedFilterController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { filterId } = req.params;

    if (!filterId) {
      return res.status(400).json({ success: false, message: "Filter ID is required" });
    }

    const user = await usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.savedFilters) {
      user.savedFilters = user.savedFilters.filter(f => (f as any)._id.toString() !== filterId);
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Saved filter deleted successfully"
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete saved filter" });
  }
};