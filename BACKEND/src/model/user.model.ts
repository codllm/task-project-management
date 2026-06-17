import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt'; // Fixed typo in import
import jwt from 'jsonwebtoken';

// Tell TypeScript that these methods exist on a User document
interface IUserMethods {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string): Promise<boolean>;
  generateToken(): string;
}

// Combine the standard Mongoose Document, fields, and our custom methods
export interface IUser extends Document, IUserMethods {
  username:{
    firstname: string;
    lastname: string;
  }
  email: string;
  password: string;
  age?: number;
  gender:string,
  createdAt: Date;
  updatedAt: Date;
  usertype: string;
  phone?: number;
  notificationPreferences?: {
    comments: boolean;
    assignments: boolean;
    mentions: boolean;
    reminders: boolean;
  };
  pinnedProjects?: mongoose.Types.ObjectId[];
  pinnedTasks?: mongoose.Types.ObjectId[];
  avatarUrl?: string;
  savedFilters?: {
    name: string;
    project: mongoose.Types.ObjectId;
    query: {
      assignee?: string | null;
      priority?: string | null;
      dueDate?: string | null;
      label?: string | null;
      sortBy?: string;
      sortOrder?: string;
    };
  }[];
}

//  Pass both IUser and the custom methods type to the Schema definition
const UserSchema = new Schema<IUser, {}, IUserMethods>({
  username: {
    firstname:{
      type: String,
      required: true,
      trim: true,
    },
    lastname:{
      type: String,
      required: true,
      trim: true,
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 3,
  },
  age: {
    type: Number,
    required: false,
  },
  gender:{
    type: String,
    required: true,
  },
  usertype:{
    type: String,
    required: true,
    enum:["individual","team","admin"]
  },
  phone:{
    type: Number,
    required: false,
  },
  notificationPreferences: {
    comments: { type: Boolean, default: true },
    assignments: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
  },
  pinnedProjects: [
    {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
  ],
  pinnedTasks: [
    {
      type: Schema.Types.ObjectId,
      ref: "Task",
    },
  ],
  avatarUrl: {
    type: String,
    default: "",
  },
  savedFilters: [
    {
      name: { type: String, required: true },
      project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
      query: {
        assignee: { type: String, default: null },
        priority: { type: String, default: null },
        dueDate: { type: String, default: null },
        label: { type: String, default: null },
        sortBy: { type: String, default: "position" },
        sortOrder: { type: String, default: "asc" },
      },
    },
  ],
}, {
  timestamps: true,
});


UserSchema.methods.hashPassword = async function (password: string): Promise<string> {
  return await bcrypt.hash(password, 10); 
};

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateToken = function (): string {

  const secret = process.env.JWT_SECRET_KEY || 'your-fallback-secret';
  return jwt.sign({ id: this._id }, secret, { expiresIn: '1d' });
};

// 5. Create and export the model
const User = mongoose.model<IUser>('User', UserSchema);
export default User;