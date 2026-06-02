import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { createUser,updateUser,forgetPassword } from "../services/user.service"; // Named import
import usermodel from "../model/user.model";

export const signup = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    username: { firstname, lastname },
    email,
    password,
    age,
    gender,
    usertype,
    phone
  } = req.body;

  try {

    const newUser = await createUser({ firstname, lastname, email, password, age, gender,usertype,phone });
    
    const token = newUser.generateToken();

    console.log("New user created:", newUser); // Debugging log
    return res.status(201).json({ user: newUser, token });
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
  if(!passwordMatch){
    return res.status(401).json({ message: "Incorrect Password" });
  }
  //match found, generate token now

  const token = user.generateToken();
  return res.status(200).json({ user, token });
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