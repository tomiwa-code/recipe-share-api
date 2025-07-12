import asyncHandler from "express-async-handler";
import User from "../models/User";

/**
 * @desc Fetch a user.
 * @route GET /api/v1/user/:username
 * @param req - Express request object containing username as a URL parameter.
 * @access Public
 * @returns {Object} - User details.
 */
export const getUser = asyncHandler(async (req, res) => {
  const { username } = req.params;

  // Check if username is provided in body, otherwise return 400 error
  if (!username) {
    res.status(400);
    throw new Error("Please provide a username");
  }

  // Get user by username, excluding sensitive fields
  const user = await User.find({ username }).select(
    "-password -email -token -updatedAt -__v"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(201).json({
    success: true,
    message: "User profile fetched successfully",
    data: Array.isArray(user) ? user[0] : user,
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
})

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
