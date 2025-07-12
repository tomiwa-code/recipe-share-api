import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import {
  createRecipe,
  deleteRecipe,
  getRecipeById,
  getRecipes,
  toggleSaveRecipe,
  updateRecipe,
} from "../controllers/recipe.controller";
import { recipeImageUpload } from "../middlewares/upload.middleware";

const recipeRouter = Router();

// Public routes
recipeRouter.get("/", getRecipes);
recipeRouter.get("/:id", getRecipeById);

// Protected routes
recipeRouter.post("/create", protect, recipeImageUpload, createRecipe);
recipeRouter.put("/update/:id", protect, recipeImageUpload, updateRecipe);
recipeRouter.delete("/delete/:id", protect, deleteRecipe);
recipeRouter.post("/save", protect, toggleSaveRecipe);

export default recipeRouter;
