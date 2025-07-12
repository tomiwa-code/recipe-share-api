import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import { createRecipe } from "../controllers/recipe.controller";
import { recipeImageUpload } from "../middlewares/upload.middleware";

const recipeRouter = Router();

// Public routes

// Protected routes
recipeRouter.post("/create", protect, recipeImageUpload, createRecipe);

// recipeRouter
//   .route("/:id")
//   .get(getRecipeById)
//   .put(protect, updateRecipe)
//   .delete(protect, deleteRecipe);

// recipeRouter.route("/:id/save").post(protect, toggleSaveRecipe);

export default recipeRouter;
