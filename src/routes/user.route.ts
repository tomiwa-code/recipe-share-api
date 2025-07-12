import { Router } from "express";
import {
  getUser,
  getUsers,
  getUserSavedRecipes,
  getUserSharedRecipes,
} from "../controllers/user.controller";
import { admin, protect } from "../middlewares/auth.middleware";

const userRouter = Router();

// Public routes
userRouter.get("/username/:username", getUser);
userRouter.get("/", protect, admin, getUsers);
userRouter.get("/:username/shared-recipes", getUserSharedRecipes);

// Protected routes
userRouter.get("/saved-recipes", protect, getUserSavedRecipes);

export default userRouter;
