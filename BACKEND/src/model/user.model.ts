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
  age: number;
  gender:string,
  createdAt: Date;
  updatedAt: Date;
  usertype: string;
  phone:number;
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
    required: true,
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
  }
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