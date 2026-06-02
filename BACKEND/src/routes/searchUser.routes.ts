const router = require("express").Router();
import { userauth } from "../middleware/auth.middleware";
const usersearch = require("../controllers/searchUser.controller").usersearch;
router.get("/user/suggestion/:qurey",userauth,usersearch);