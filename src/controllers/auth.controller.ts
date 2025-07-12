import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import {
  DEFAULT_AVATAR,
  DEFAULT_COVER_PHOTO,
  JWT_EXPIRES_IN,
  JWT_SECRET,
} from "../config/env";
import { withTransaction } from "../utils/operations";
import mongoose from "mongoose";
import { generateUniqueUsername } from "../utils/helper";
import asyncHandler from "express-async-handler";

// Generate JWT Token
const generateToken = (id: string, role: string) => {
  if (!JWT_SECRET || typeof JWT_SECRET !== "string") {
    throw new Error("JWT_SECRET is not defined or not a string");
  }

  if (!JWT_EXPIRES_IN) {
    throw new Error("JWT_EXPIRES_IN is not defined");
  }

  return jwt.sign({ userId: id, role }, JWT_SECRET, {
    expiresIn: "30d",
  });
};

/**
 * @desc Register a user.
 * @route POST /api/v1/auth/signup
 * @param req - Express request object containing (name, email, password).
 * @access Public
 * @returns {Object} - User details and JWT token.
 */
export const signUp = withTransaction(
  async (
    req: Request,
    res: Response,
    session: mongoose.mongo.ClientSession
  ) => {
    const { name, email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide an email and password");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error("Please provide a valid email address");
    }

    // Check password strength
    if (password.length < 8) {
      res.status(400);
      throw new Error("Password must be at least 8 characters long");
    }

    // Check if user already exists
    const userExists = await User.findOne({ email }).session(session);
    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    // Generate a unique username by appending a suffix if necessary
    const username = await generateUniqueUsername(name || email, User, session);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create(
      [
        {
          name,
          email,
          username,
          avatar: {
            public_id: "",
            url: DEFAULT_AVATAR,
          },
          coverPhoto: {
            public_id: "",
            url: DEFAULT_COVER_PHOTO,
          },
          password: hashedPassword,
        },
      ],
      { session }
    );

    const createdUser = Array.isArray(user) ? user[0] : user;

    const token = generateToken(createdUser._id.toString(), createdUser.role);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        _id: createdUser._id,
        name: createdUser.name,
        username: createdUser.username,
        email: createdUser.email,
        role: createdUser.role,
        avatar: createdUser.avatar,
        coverPhoto: createdUser.coverPhoto,
        token,
      },
    });
  }
);

/**
 * @desc Login a user.
 * @route POST /api/v1/auth/signin
 * @param req - Express request object containing (username or email, password).
 * @access Public
 * @returns {Object} - User details and JWT token.
 */
export const signIn = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if username or email and password are provided
  if ((!username && !email) || !password) {
    res.status(400);
    throw new Error("Please provide username or email and password");
  }

  // Check user is not providing both username and email at the same time
  if (username && email) {
    res.status(400);
    throw new Error("Please provide either username or email, not both");
  }

  // Find user by username or email
  const user = username
    ? await User.findOne({ username })
    : await User.findOne({ email });

  // if user is not found, return 401 error
  if (!user) {
    res.status(401);
    throw new Error("User not found");
  }

  // Check if password matches
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  const token = generateToken(user._id.toString(), user.role);

  res.status(201).json({
    success: true,
    message: "User logged in successfully",
    data: {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      coverPhoto: user.coverPhoto,
      token,
    },
  });
});
