import { Router } from "express";
import { getUser, getUsers } from "../controllers/user.controller";
import { admin, protect } from "../middlewares/auth.middleware";

const userRouter = Router();

// Public routes
userRouter.get("/:username", getUser);
userRouter.get("/", protect, admin, getUsers);

// Protected routes

export default userRouter;
