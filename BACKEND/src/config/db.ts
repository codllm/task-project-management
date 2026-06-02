import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async (): Promise<void> => {
  try {

    const mongoURI =
      process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ts-auth";

    await mongoose.connect(mongoURI);

    console.log("🚀 MongoDB connected successfully");

  } catch (error) {

    console.error("❌ MongoDB connection failed:", error);

    process.exit(1);
  }
};

export default connectDB;