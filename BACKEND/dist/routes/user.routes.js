"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express"); // Use import instead of require
const express_validator_1 = require("express-validator");
const user_controller_1 = require("../controllers/user.controller");
// import auth from "../middleware/auth.middleware";
const { userauth } = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post("/new/register", [
    (0, express_validator_1.body)("username.firstname")
        .isString()
        .withMessage("First name must be a string")
        .notEmpty(),
    (0, express_validator_1.body)("username.lastname")
        .isString()
        .withMessage("Last name must be a string")
        .notEmpty(),
    (0, express_validator_1.body)("email")
        .isEmail()
        .withMessage("Invalid email format")
        .notEmpty(),
    (0, express_validator_1.body)("password")
        .isLength({ min: 3 })
        .withMessage("Password must be at least 3 characters long")
        .notEmpty(),
    (0, express_validator_1.body)("age")
        .isInt({ min: 0 })
        .withMessage("Age must be a positive integer")
        .notEmpty(),
    (0, express_validator_1.body)("gender")
        .isString()
        .withMessage("Gender is required")
        .notEmpty(),
    (0, express_validator_1.body)("usertype")
        .isIn(["individual", "team", "admin"])
        .withMessage("Invalid user type")
        .notEmpty()
], user_controller_1.signup);
router.post("/login", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Invalid email format").notEmpty(),
    (0, express_validator_1.body)("password").isLength({ min: 3 }).withMessage("Password must be at least 3 characters long").notEmpty(),
], user_controller_1.login);
router.post("/update", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Invalid email format").notEmpty(),
    (0, express_validator_1.body)("phone").isNumeric().withMessage("Phone must be a number").notEmpty(),
], userauth, user_controller_1.updateUserProfile);
router.get('/forget-password', [
    (0, express_validator_1.body)("email").isEmail().withMessage("Invalid email format").notEmpty(),
], user_controller_1.forgetPass);
router.get("/profile", userauth, user_controller_1.profile);
router.post("/logout", userauth, user_controller_1.logout);
exports.default = router;
