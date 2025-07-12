import asyncHandler from "express-async-handler";
import Recipe from "../models/Recipe";
import User from "../models/User";
import { withTransaction } from "../utils/operations";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { optimizeImage } from "../utils/helper";
import cloudinary from "../config/cloudinary";

/**
 * @desc Create a recipe.
 * @route POST /api/v1/recipe/create
 * @param req - Form data containing recipe details.
 * @access Private (creator or admin)
 * @returns {Object} - Created recipe details.
 */
export const createRecipe = withTransaction(
  async (
    req: Request,
    res: Response,
    session: mongoose.mongo.ClientSession
  ) => {
    //   Check if userId is available in req.user
    if (!req.user || !req.user._id) {
      res.status(401);
      throw new Error("Unauthorized, user information not found");
    }

    // Extract form data
    const formData = req.body;
    const {
      name,
      desc,
      prepTime,
      difficulty,
      serving,
      cuisine,
      nutritionFacts,
      ingredients,
      instructions,
    } = formData;

    // Validate required fields
    const requiredFields = [
      "name",
      "desc",
      "prepTime",
      "difficulty",
      "serving",
      "cuisine",
      "ingredients",
      "instructions",
    ];

    const missingFields = requiredFields.filter((field) => !formData[field]);
    if (missingFields.length > 0) {
      res.status(400);
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    // Convert ingredients and instructions to arrays
    const ingredientsArr = JSON.parse(ingredients);
    const instructionsArr = JSON.parse(instructions);
    const nutritionFactsArr = JSON.parse(nutritionFacts);

    // Validate arrays
    if (!Array.isArray(nutritionFactsArr) || nutritionFactsArr.length === 0) {
      res.status(400);
      throw new Error("Nutrition facts must be a non-empty array");
    }

    if (!Array.isArray(ingredientsArr) || ingredientsArr.length === 0) {
      res.status(400);
      throw new Error("Ingredients must be a non-empty array");
    }

    if (!Array.isArray(instructionsArr) || instructionsArr.length === 0) {
      res.status(400);
      throw new Error("Instructions must be a non-empty array");
    }

    // Validate image file
    if (!req.file) {
      res.status(400);
      throw new Error("Recipe image is required");
    }

    try {
      // Optimize and upload image to Cloudinary
      const optimizedImage = await optimizeImage(req.file.buffer);

      // Convert buffer to base64 and prepend data URI
      const base64Image = `data:image/webp;base64,${optimizedImage.toString(
        "base64"
      )}`;
      const uploadResult = await cloudinary.uploader.upload(base64Image, {
        folder: "recipe-share/recipe-images",
        transformation: [
          { width: 800, height: 600, crop: "limit", quality: "auto" },
          { format: "webp" },
        ],
      });

      const recipe = await Recipe.create(
        [
          {
            name,
            desc,
            prepTime,
            difficulty,
            serving,
            cuisine,
            nutritionFacts: nutritionFactsArr,
            ingredients: ingredientsArr,
            instructions: instructionsArr,
            imageUrl: uploadResult.secure_url,
            createdBy: req.user._id,
          },
        ],
        { session }
      );

      // Update user's recipe stats
      await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { "stats.recipesShared": 1 } },
        { session, new: false } // Important: Use same session
      );

      // Populate creator info
      const createdRecipe = await Recipe.findById(recipe[0]._id)
        .populate("createdBy", "_id name avatar location")
        .session(session);

      res.status(201).json({
        success: true,
        message: "Recipe created successfully",
        data: createdRecipe,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error("Image upload error:", error.message);
        res.status(500);
        throw new Error("Failed to upload recipe image");
      }
      throw error;
    }
  }
);

// @desc    Get all recipes with filters
// @route   GET /api/recipes
// @access  Public
// export const getRecipes = asyncHandler(async (req, res) => {
//   const {
//     search,
//     difficulty,
//     cuisine,
//     maxPrep,
//     minRating,
//     sort,
//     page = 1,
//     limit = 10,
//   } = req.query;

//   let query = {};
//   let sortOptions = { createdAt: -1 };

//   // Search filter
//   if (search) {
//     query.$text = { $search: search };
//   }

//   // Difficulty filter
//   if (difficulty) {
//     query.difficulty = difficulty;
//   }

//   // Cuisine filter
//   if (cuisine) {
//     query.cuisine = new RegExp(cuisine, "i");
//   }

//   // Max preparation time
//   if (maxPrep) {
//     query.prepTime = { ...query.prepTime, $lte: Number(maxPrep) };
//   }

//   // Minimum rating
//   if (minRating) {
//     query.rating = { ...query.rating, $gte: Number(minRating) };
//   }

//   // Sorting options
//   if (sort === "newest") {
//     sortOptions = { createdAt: -1 };
//   } else if (sort === "oldest") {
//     sortOptions = { createdAt: 1 };
//   } else if (sort === "rating") {
//     sortOptions = { rating: -1 };
//   } else if (sort === "prepTime") {
//     sortOptions = { prepTime: 1 };
//   }

//   const pageNum = Number(page);
//   const limitNum = Number(limit);
//   const skip = (pageNum - 1) * limitNum;

//   const total = await Recipe.countDocuments(query);
//   const recipes = await Recipe.find(query)
//     .populate("createdBy", "username profilePicture")
//     .sort(sortOptions)
//     .skip(skip)
//     .limit(limitNum);

//   res.json({
//     recipes,
//     page: pageNum,
//     pages: Math.ceil(total / limitNum),
//     total,
//   });
// });

// @desc    Get single recipe
// @route   GET /api/recipes/:id
// @access  Public
// export const getRecipeById = asyncHandler(async (req, res) => {
//   const recipe = await Recipe.findById(req.params.id)
//     .populate("createdBy", "username profilePicture")
//     .populate("savedBy", "username");

//   if (!recipe) {
//     res.status(404);
//     throw new Error("Recipe not found");
//   }

//   res.json(recipe);
// });

// @desc    Update a recipe
// @route   PUT /api/recipes/:id
// @access  Private (creator or admin)
// export const updateRecipe = asyncHandler(async (req, res) => {
//   const recipe = await Recipe.findById(req.params.id);

//   if (!recipe) {
//     res.status(404);
//     throw new Error("Recipe not found");
//   }

//   // Check if user is creator or admin
//   if (
//     recipe.createdBy.toString() !== req.user._id.toString() &&
//     req.user.role !== "admin"
//   ) {
//     res.status(401);
//     throw new Error("Not authorized to update this recipe");
//   }

//   const {
//     name,
//     desc,
//     prepTime,
//     difficulty,
//     serving,
//     cuisine,
//     nutritionFacts,
//     ingredients,
//     instructions,
//   } = req.body;

//   recipe.name = name || recipe.name;
//   recipe.desc = desc || recipe.desc;
//   recipe.prepTime = prepTime || recipe.prepTime;
//   recipe.difficulty = difficulty || recipe.difficulty;
//   recipe.serving = serving || recipe.serving;
//   recipe.cuisine = cuisine || recipe.cuisine;
//   recipe.nutritionFacts = nutritionFacts || recipe.nutritionFacts;
//   recipe.ingredients = ingredients || recipe.ingredients;
//   recipe.instructions = instructions || recipe.instructions;

//   const updatedRecipe = await recipe.save();

//   res.json(updatedRecipe);
// });

// @desc    Delete a recipe
// @route   DELETE /api/recipes/:id
// @access  Private (creator or admin)
// export const deleteRecipe = asyncHandler(async (req, res) => {
//   const recipe = await Recipe.findById(req.params.id);

//   if (!recipe) {
//     res.status(404);
//     throw new Error("Recipe not found");
//   }

//   // Check if user is creator or admin
//   if (
//     recipe.createdBy.toString() !== req.user._id.toString() &&
//     req.user.role !== "admin"
//   ) {
//     res.status(401);
//     throw new Error("Not authorized to delete this recipe");
//   }

//   await recipe.remove();

//   // Remove from all users' favorites
//   await User.updateMany(
//     { savedRecipes: recipe._id },
//     { $pull: { savedRecipes: recipe._id } }
//   );

//   res.json({ message: "Recipe removed" });
// });

// @desc    Toggle save recipe
// @route   POST /api/recipes/:id/save
// @access  Private
// export const toggleSaveRecipe = asyncHandler(async (req, res) => {
//   const recipe = await Recipe.findById(req.params.id);

//   if (!recipe) {
//     res.status(404);
//     throw new Error("Recipe not found");
//   }

//   const user = await User.findById(req.user._id);
//   const isSaved = user.savedRecipes.includes(recipe._id);

//   if (isSaved) {
//     // Remove from user's saved recipes
//     user.savedRecipes.pull(recipe._id);
//     // Remove user from recipe's savedBy
//     recipe.savedBy.pull(user._id);
//   } else {
//     // Add to user's saved recipes
//     user.savedRecipes.push(recipe._id);
//     // Add user to recipe's savedBy
//     recipe.savedBy.push(user._id);
//   }

//   await user.save();
//   await recipe.save();

//   res.json({
//     isSaved: !isSaved,
//     savedCount: recipe.savedBy.length,
//   });
// });
