import asyncHandler from "express-async-handler";
import Recipe from "../models/Recipe";
import User from "../models/User";
import { withTransaction } from "../utils/operations";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { optimizeImage } from "../utils/helper";
import cloudinary from "../config/cloudinary";

// Constants
export const creatorFields = "_id name avatar location role"; // Fields to populate for recipe creator

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
            image: {
              public_id: uploadResult.public_id,
              url: uploadResult.secure_url,
            },
            createdBy: req.user._id,
          },
        ],
        { session }
      );

      // Populate creator info
      const createdRecipe = await Recipe.findById(recipe[0]._id)
        .populate("createdBy", creatorFields)
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

/**
 * @desc Get all recipes with filters.
 * @route POST /api/v1/recipe
 * @query {string} search - Text ?search=query (name, desc, cuisine), ?difficulty, ?maxPrep, ?minRating, ?page, ?limit.
 * @access Public
 * @returns {Object} - Recipes details.
 */
export const getRecipes = asyncHandler(async (req, res) => {
  const {
    search,
    difficulty,
    cuisine,
    maxPrep,
    minRating,
    sort,
    page = 1,
    limit = 20,
  } = req.query;

  let query: any = {};
  let sortOptions: any = { createdAt: -1 }; // Default: newest first

  // --- TEXT SEARCH (with fuzzy matching) ---
  if (search) {
    query.$text = {
      $search: search,
      $caseSensitive: false, // Ignore case
      $diacriticSensitive: false, // Ignore accents (e.g., "café" matches "cafe")
    };
  }

  // --- FILTERS ---
  if (difficulty) query.difficulty = difficulty;
  if (typeof cuisine === "string") query.cuisine = new RegExp(cuisine, "i");
  if (maxPrep) query.prepTime = { ...query.prepTime, $lte: Number(maxPrep) };
  if (minRating) query.rating = { ...query.rating, $gte: Number(minRating) };

  // --- SORTING ---
  if (sort === "newest") sortOptions = { createdAt: -1 };
  else if (sort === "oldest") sortOptions = { createdAt: 1 };
  else if (sort === "rating") sortOptions = { rating: -1 };
  else if (sort === "prepTime") sortOptions = { prepTime: 1 };
  else if (search) {
    // Sort by text relevance ONLY if searching
    sortOptions = { score: { $meta: "textScore" } };
  }

  // --- PAGINATION ---
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // --- DATABASE QUERY ---
  const total = await Recipe.countDocuments(query);
  const recipes = await Recipe.find(
    query,
    search ? { score: { $meta: "textScore" } } : {} // Include relevance score if searching
  )
    .populate("createdBy", creatorFields)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  // --- RESPONSE ---
  res.status(201).json({
    success: true,
    message:
      recipes.length > 0 ? "Recipes fetched successfully" : "No recipes found",
    data: recipes,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    total,
  });
});

/**
 * @desc Get single recipe.
 * @route GET /api/recipe/:id
 * @param {string} id - Recipe ID.
 * @access Public
 * @returns {Object} - Recipes details.
 */
export const getRecipeById = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id)
    .populate("createdBy", creatorFields) // Populate creator info
    .populate("savedBy", "username");

  if (!recipe) {
    res.status(404);
    throw new Error("Recipe not found");
  }

  res.status(201).json({
    success: true,
    message: "Recipe fetched successfully",
    data: recipe,
  });
});

/**
 * @desc Update a recipe.
 * @route  PUT /api/recipes/update/:id
 * @param {string} id - Recipe ID.
 * @access Private (creator or admin)
 * @returns {Object} - Recipes details.
 */
export const updateRecipe = withTransaction(
  async (
    req: Request,
    res: Response,
    session: mongoose.mongo.ClientSession
  ) => {
    // Check for authorization
    if (!req.user || !req.user._id) {
      res.status(401);
      throw new Error("Unauthorized, user information not found");
    }

    // Get the recipe with session
    const recipe = await Recipe.findById(req.params.id).session(session);

    // Validate recipe
    if (!recipe) {
      res.status(404);
      throw new Error("Recipe not found");
    }

    // Check if the user is the creator or admin
    if (
      recipe.createdBy._id.toString() !== req.user._id.toString() &&
      (req.user as any).role !== "admin"
    ) {
      res.status(401);
      throw new Error("Not authorized to update this recipe");
    }

    // Extract form data
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
    } = req.body;

    // Update scalar fields
    recipe.name = name || recipe.name;
    recipe.desc = desc || recipe.desc;
    recipe.prepTime = prepTime ? Number(prepTime) : recipe.prepTime;
    recipe.difficulty = difficulty || recipe.difficulty;
    recipe.serving = serving ? Number(serving) : recipe.serving;
    recipe.cuisine = cuisine || recipe.cuisine;

    // Handle nutritionFacts
    if (nutritionFacts) {
      try {
        const parsedNutrition = JSON.parse(nutritionFacts);

        if (!Array.isArray(parsedNutrition) || parsedNutrition.length === 0) {
          res.status(400);
          throw new Error("Nutrition facts must be a non-empty array");
        }

        recipe.nutritionFacts = parsedNutrition as any;
      } catch (error) {
        res.status(400);
        throw new Error("Invalid nutrition facts format");
      }
    }

    // Handle ingredients
    if (ingredients) {
      try {
        const parsedIngredients = JSON.parse(ingredients);

        if (
          !Array.isArray(parsedIngredients) ||
          parsedIngredients.length === 0
        ) {
          res.status(400);
          throw new Error("Ingredients must be a non-empty array");
        }

        recipe.ingredients = parsedIngredients as any;
      } catch (error) {
        res.status(400);
        throw new Error("Invalid ingredients format");
      }
    }

    // Handle instructions
    if (instructions) {
      try {
        const parsedInstructions = JSON.parse(instructions);

        if (
          !Array.isArray(parsedInstructions) ||
          parsedInstructions.length === 0
        ) {
          res.status(400);
          throw new Error("Instructions must be a non-empty array");
        }

        recipe.instructions = parsedInstructions as any;
      } catch (error) {
        res.status(400);
        throw new Error("Invalid instructions format");
      }
    }

    // Handle image update
    if (req.file) {
      try {
        // Optimize and upload image to Cloudinary
        const optimizedImage = await optimizeImage(req.file.buffer);
        const uploadResult = await cloudinary.uploader.upload(
          `data:image/webp;base64,${optimizedImage.toString("base64")}`,
          {
            folder: "recipe-share/recipe-images",
            transformation: [
              { width: 800, height: 600, crop: "limit", quality: "auto" },
              { format: "webp" },
            ],
          }
        );

        // Delete old image if exists
        if (recipe.image && recipe.image.public_id) {
          try {
            await cloudinary.uploader.destroy(recipe.image.public_id);
          } catch (deleteError) {
            console.error("Error deleting old image:", deleteError);
            // Don't fail the whole update if deletion fails
          }
        }

        // Update image details
        recipe.image = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        res.status(500);
        throw new Error("Failed to upload new recipe image");
      }
    }

    // Save the updated recipe within transaction
    const updatedRecipe = await recipe.save({ session });

    // Populate creator info
    const populatedRecipe = await Recipe.populate(updatedRecipe, {
      path: "createdBy",
      select: creatorFields,
    });

    res.status(200).json({
      success: true,
      message: "Recipe updated successfully",
      data: populatedRecipe,
    });
  }
);

/**
 * @desc Delete a recipe.
 * @route  DELETE /api/recipes/delete/:id
 * @param {string} id - Recipe ID.
 * @access Private (creator or admin)
 * @returns {Object} - Success message.
 */
export const deleteRecipe = withTransaction(
  async (
    req: Request,
    res: Response,
    session: mongoose.mongo.ClientSession
  ) => {
    // Check for authorization
    if (!req.user || !req.user._id) {
      res.status(401);
      throw new Error("Unauthorized, user information not found");
    }

    // Get the recipe with transaction session
    const recipe = await Recipe.findById(req.params.id)
      .session(session)
      .populate("createdBy", "_id"); // Only populate necessary fields

    // Validate recipe
    if (!recipe) {
      res.status(404);
      throw new Error("Recipe not found");
    }

    // Convert both IDs to string for safe comparison
    const recipeCreatorId = recipe.createdBy._id.toString();
    const currentUserId = req.user._id.toString();

    // Authorization check
    const isCreator = recipeCreatorId === currentUserId;
    const isAdmin = (req.user as any).role === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this recipe",
      });
    }

    //  Store values needed after deletion
    const imagePublicId = recipe.image?.public_id;

    // Delete the recipe
    await recipe.deleteOne({ session });

    // Remove from users' saved recipes
    await User.updateMany(
      { savedRecipes: recipe._id },
      { $pull: { savedRecipes: recipe._id } },
      { session } // Include session in the update
    );

    // Delete image from Cloudinary AFTER successful database operations
    if (imagePublicId) {
      try {
        await cloudinary.uploader.destroy(imagePublicId);
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion failed:", cloudinaryError);
        // Log but don't fail the request since DB operations succeeded
      }
    }

    return res.status(200).json({
      success: true,
      message: "Recipe successfully removed",
    });
  }
);

/**
 * @desc Toggle save recipe.
 * @route  POST /api/recipe/save
 * @param {string} id - Recipe ID.
 * @access Private (any logged-in user can save/unsave)
 * @returns {Object} - Success message, Saved counts.
 */
export const toggleSaveRecipe = withTransaction(
  async (
    req: Request,
    res: Response,
    session: mongoose.mongo.ClientSession
  ) => {
    // Check for authorization
    if (!req.user || !req.user._id) {
      res.status(401);
      throw new Error("Unauthorized, user information not found");
    }

    if (!req.body.recipeId) {
      res.status(400);
      throw new Error("Please provide a recipe ID");
    }

    const userId = req.user._id;
    const recipeId = req.body.recipeId;

    // Get both user and recipe with transaction session
    const user = await User.findById(userId).session(session);
    const recipe = await Recipe.findById(recipeId)
      .populate("createdBy", "_id")
      .session(session); // Only populate necessary fields

    // Validate user
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Validate recipe
    if (!recipe) {
      res.status(404);
      throw new Error("Recipe not found");
    }

    // Prevent users from saving their own recipes
    if (recipe && recipe.createdBy._id.toString() === userId.toString()) {
      res.status(400);
      throw new Error("You cannot save your own recipe");
    }

    // Check if recipe is already saved
    const isSaved = recipe.savedBy.some(
      (id) => id.toString() === userId.toString()
    );

    let updatedRecipe;
    let updatedUser;

    if (isSaved) {
      // Remove from saved recipes
      updatedRecipe = await Recipe.findByIdAndUpdate(
        recipeId,
        { $pull: { savedBy: userId } },
        { new: true, session }
      );

      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $pull: { savedRecipes: recipeId } },
        { new: true, session }
      );
    } else {
      // Add to saved recipes
      updatedRecipe = await Recipe.findByIdAndUpdate(
        recipeId,
        { $addToSet: { savedBy: userId } },
        { new: true, session }
      );

      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { savedRecipes: recipeId } },
        { new: true, session }
      );
    }

    // Get updated save count
    const saveCount = updatedRecipe?.savedBy.length || 0;

    res.status(200).json({
      success: true,
      message: `Recipe ${isSaved ? "unsaved" : "saved"} successfully`,
      isSaved: !isSaved,
      saveCount,
    });
  }
);
