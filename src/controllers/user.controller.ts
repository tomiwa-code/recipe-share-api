import asyncHandler from "express-async-handler";
import User from "../models/User";
import { creatorFields } from "./recipe.controller";
import Recipe from "../models/Recipe";

/**
 * @desc Fetch a user.
 * @route GET /api/v1/user/username/:username
 * @param req - Express request object containing username as a URL parameter.
 * @access Public
 * @returns {Object} - User details.
 */
export const getUser = asyncHandler(async (req, res) => {
  const { username } = req.params;

  // Validate username presence
  if (!username) {
    res.status(400);
    throw new Error("Username is required");
  }

  // Strict username validation (alphanumeric only, no spaces or special characters)
  const usernameRegex = /^[a-zA-Z0-9]+$/;

  if (!usernameRegex.test(username)) {
    res.status(400);
    throw new Error(
      "Invalid username format. Only letters and numbers are allowed"
    );
  }

  // Find user by username (case-insensitive)
  const user = await User.findOne({
    username: { $regex: new RegExp(`^${username}$`, "i") },
  }).select("-password -email -token -updatedAt -__v");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    success: true,
    message: "User profile fetched successfully",
    data: user,
  });
});

/**
 * @desc Fetch all user.
 * @route GET /api/v1/user
 * @access Private (only admins)
 * @returns {Object} - User details.
 */
export const getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find().select("-password -token -updatedAt -__v");

  res.status(201).json({
    success: true,
    message: "Users fetched successfully",
    count: users.length,
    data: users,
  });
});

// // Update User Profile
// export const updateProfile = asyncHandler(async (req, res) => {
//   const user = await User.findById(req.user.id);

//   if (!user) {
//     res.status(404);
//     throw new Error("User not found");
//   }

//   user.username = req.body.username || user.username;
//   user.email = req.body.email || user.email;

//   if (req.body.password) {
//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(req.body.password, salt);
//   }

//   const updatedUser = await user.save();

//   res.json({
//     _id: updatedUser._id,
//     username: updatedUser.username,
//     email: updatedUser.email,
//     role: updatedUser.role,
//   });
// });

/**
 * @desc Get user saved recipes.
 * @route  Get /api/user/saved-recipes
 * @access Private (creator or admin)
 * @returns {Object} - List of saved recipes.
 */
export const getUserSavedRecipes = asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error("Unauthorized, user information not found");
  }

  const userId = req.user._id;

  // Get user with saved recipes populated
  const user = await User.findById(userId).populate({
    path: "savedRecipes",
    populate: {
      path: "createdBy",
      select: creatorFields,
    },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Extract saved recipes from user document
  const savedRecipes = user.savedRecipes;

  res.status(200).json({
    success: true,
    message:
      savedRecipes.length > 0
        ? "User saved recipes fetched successfully"
        : "No saved recipes found for this user",
    savedRecipes,
  });
});

/**
 * @desc Get user shared recipes.
 * @route  Get /api/user/:username/shared-recipes
 * @param {string} username - User's username.
 * @access Public
 * @returns {Object} - List of shared recipes.
 */
export const getUserSharedRecipes = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    res.status(400).json({
      success: false,
      message: "Username is required",
    });
    return;
  }

  // Case-insensitive search Before searching
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    res.status(400).json({
      success: false,
      message: "Invalid username format",
    });
    return;
  }

  const user = await User.findOne({ username: username.toLowerCase() }).select(
    "_id"
  );

  if (!user) {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
    return;
  }

  // Fetch recipes with pagination
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [recipes, total] = await Promise.all([
    Recipe.find({ createdBy: user._id })
      .populate({
        path: "createdBy",
        select: "_id name username avatar", // Ensure this matches your model
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),

    Recipe.countDocuments({ createdBy: user._id }),
  ]);

  res.status(200).json({
    success: true,
    message:
      recipes.length > 0
        ? "User shared recipes fetched successfully"
        : "No shared recipes found for this user",
    recipes,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  });
});
