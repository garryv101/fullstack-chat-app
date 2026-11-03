import express from "express";
import { deleteUser, getUsers } from "../controllers/admin.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute, requireAdmin);
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);

export default router;
