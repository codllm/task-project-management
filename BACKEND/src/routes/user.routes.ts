import { Router } from "express"; // Use import instead of require
import { body } from "express-validator";
import { signup, login, profile, logout,updateUserProfile,forgetPass, updatePreferences, togglePinProjectController, togglePinTaskController, getPinnedItemsController, updateAvatarController, saveFilterController, getSavedFiltersController, deleteSavedFilterController } from "../controllers/user.controller";
import { userauth } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.post("/new/register", [
    body("username.firstname")
      .isString()
      .withMessage("First name must be a string")
      .notEmpty(),

    body("username.lastname")
      .isString()
      .withMessage("Last name must be a string")
      .notEmpty(),

    body("email")
      .isEmail()
      .withMessage("Invalid email format")
      .notEmpty(),

    body("password")
      .isLength({ min: 3 })
      .withMessage("Password must be at least 3 characters long")
      .notEmpty(),

    body("phone")
      .isNumeric()
      .withMessage("Phone must be a number")
      .notEmpty()
      .withMessage("Phone number is required"),

    body("gender")
      .isString()
      .withMessage("Gender is required")
      .notEmpty(),

    body("usertype")
      .isIn(["individual", "team", "admin"])
      .withMessage("Invalid user type")
      .notEmpty()

], signup);


router.post("/login", [
    body("email").isEmail().withMessage("Invalid email format").notEmpty(),
    body("password").isLength({ min: 3 }).withMessage("Password must be at least 3 characters long").notEmpty(),
], login);

router.post("/update", [
    body("email").isEmail().withMessage("Invalid email format").notEmpty(),
    body("phone").isNumeric().withMessage("Phone must be a number").notEmpty(),
], userauth,updateUserProfile
);

router.get('/forget-password', [
    body("email").isEmail().withMessage("Invalid email format").notEmpty(),
], forgetPass)

router.get("/profile", userauth, profile);
router.put("/preferences", userauth, updatePreferences);
router.post("/logout", userauth, logout);

// Pinning routes
router.post("/pin-project/:projectId", userauth, togglePinProjectController);
router.post("/pin-task/:taskId", userauth, togglePinTaskController);
router.get("/pinned", userauth, getPinnedItemsController);

// Profile avatar and saved filters routes
router.put("/profile/avatar", userauth, upload.single("avatar"), updateAvatarController);
router.post("/saved-filters", userauth, saveFilterController);
router.get("/saved-filters/:projectId", userauth, getSavedFiltersController);
router.delete("/saved-filters/:filterId", userauth, deleteSavedFilterController);

export default router;