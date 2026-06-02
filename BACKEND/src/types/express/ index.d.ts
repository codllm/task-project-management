import { Types } from "mongoose";

import { IUser } from "../../model/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};