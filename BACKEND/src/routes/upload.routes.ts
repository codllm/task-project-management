import express from "express";
import { uploadFileController } from "../controllers/upload.controller";
import { userauth } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.post(
  "/",
  userauth,
  upload.single("file"),
  uploadFileController
);

export default router;
