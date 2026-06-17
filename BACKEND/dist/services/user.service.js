"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgetPassword = exports.updateUser = exports.createUser = void 0;
const user_model_1 = __importDefault(require("../model/user.model")); // Correctly imported default model
const createUser = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstname, lastname, email, password, age, gender, usertype, phone } = userData;
    // Simple runtime validation fallback
    if (firstname == null ||
        lastname == null ||
        email == null ||
        password == null ||
        age == null ||
        gender == null ||
        usertype == null) {
        throw new Error("All fields are required");
    }
    // Check if user already exists
    const existingUser = yield user_model_1.default.findOne({ email });
    if (existingUser) {
        throw new Error("User with this email already exists");
    }
    // Corrected: Use the Model directly, either via `new User()` or `User.create()`
    const user = new user_model_1.default({
        username: {
            firstname,
            lastname
        },
        email,
        password, // Consider hashing this here using your schema method if you don't use pre-save hooks
        gender,
        age,
        usertype,
        phone: 0, // Default value for phone, adjust as needed
    });
    // Hashing password using the custom instance method we wrote earlier!
    user.password = yield user.hashPassword(password);
    yield user.save();
    return user;
});
exports.createUser = createUser;
const updateUser = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phone } = userData;
        const user = yield user_model_1.default.findOneAndUpdate({ email }, {
            $set: {
                phone
            }
        });
        return user;
    }
    catch (error) {
        throw new Error(error.message);
    }
});
exports.updateUser = updateUser;
const forgetPassword = (email, newPassword) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.default.findOne({ email });
    if (!user) {
        throw new Error("User not found");
    }
    const hashedPassword = yield user.hashPassword(newPassword);
    user.password = hashedPassword;
    yield user.save();
    return user;
});
exports.forgetPassword = forgetPassword;
