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
exports.logout = exports.forgetPass = exports.updateUserProfile = exports.profile = exports.login = exports.signup = void 0;
const express_validator_1 = require("express-validator");
const user_service_1 = require("../services/user.service"); // Named import
const user_model_1 = __importDefault(require("../model/user.model"));
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { username: { firstname, lastname }, email, password, age, gender, usertype, phone } = req.body;
    try {
        const newUser = yield (0, user_service_1.createUser)({ firstname, lastname, email, password, age, gender, usertype, phone });
        const token = newUser.generateToken();
        console.log("New user created:", newUser); // Debugging log
        return res.status(201).json({ success: true, user: newUser, token });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
});
exports.signup = signup;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const user = yield user_model_1.default.findOne({ email });
    if (!user) {
        return res.status(401).json({
            message: "Invalid credentials"
        });
    }
    const passwordMatch = yield user.comparePassword(password);
    console.log("Password Match:", passwordMatch);
    if (!passwordMatch) {
        return res.status(401).json({ message: "Incorrect Password" });
    }
    //match found, generate token now
    const token = user.generateToken();
    console.log("User logged in:", user); // Debugging
    console.log("Generated login Token:", token); // Debugging
    return res.status(200).json({ user, token });
});
exports.login = login;
const profile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return res.status(200).json({
            user: req.user,
        });
    }
    catch (err) {
        return res.status(500).json({
            message: "Server error",
        });
    }
});
exports.profile = profile;
const updateUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, phone } = req.body;
    try {
        const updatedUser = yield (0, user_service_1.updateUser)({ email, phone });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ user: updatedUser });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
});
exports.updateUserProfile = updateUserProfile;
const forgetPass = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, newPassword } = req.body;
    // Implment password reset logic here (e.g., send reset email)
    const userforget = yield (0, user_service_1.forgetPassword)(email, newPassword); // Example new password, replace with actual logic
    return res.status(200).json({ message: `Password reset link sent to ${email}` });
});
exports.forgetPass = forgetPass;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1]; // Extract token from header
    if (!token) {
        return res.status(400).json({ message: "Token is required for logout" });
    }
    console.log("Logout token:", token); // Debugging log
});
exports.logout = logout;
