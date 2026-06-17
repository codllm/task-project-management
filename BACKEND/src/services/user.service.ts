import { promises } from "dns";
import User, { IUser } from "../model/user.model"; // Correctly imported default model

// Define an interface for the incoming data
interface CreateUserInput {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  gender: string;
  usertype: string;
  phone: number;
}

export const createUser = async (userData: CreateUserInput): Promise<IUser> => {
  const { firstname, lastname, email, password, gender, usertype, phone } = userData;

  // Simple runtime validation fallback
  if (
    firstname == null ||
    lastname == null ||
    email == null ||
    password == null ||
    gender == null ||
    usertype == null ||
    phone == null
  ) {  
    throw new Error("All fields are required");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Corrected: Use the Model directly, either via `new User()` or `User.create()`
  const user = new User({
    username: {
      firstname,
      lastname
    },
    email,
    password, // Consider hashing this here using your schema method if you don't use pre-save hooks
    gender,
    usertype,
    phone, // Save actual phone number
  });

  // Hashing password using the custom instance method we wrote earlier!
  user.password = await user.hashPassword(password);

  await user.save();
  return user;
};

interface userUpdateInput {
  email:string,
  phone:number
}

export const updateUser = async (userData: userUpdateInput) => {
  try {
    const { email, phone } = userData;

    const user = await User.findOneAndUpdate(
      { email },
      {
         $set: {
            phone
         }
      }
   )

    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};


export const forgetPassword = async (
  email: string,
  newPassword: string
) => {

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("User not found");
  }

  const hashedPassword = await user.hashPassword(newPassword);

  user.password = hashedPassword;

  await user.save();

  return user;
};
