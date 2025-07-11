import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User";
import { JWT_SECRET } from "../config/env";
import type { Document } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      user?: Document | null;
    }
  }
}

declare type JwtPayloadType = {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
};

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET as string);

      if (
        typeof decoded !== "object" ||
        !decoded ||
        !("userId" in decoded) ||
        !("role" in decoded)
      ) {
        res.status(401);
        throw new Error("Not authorized, invalid token payload");
      }

      const user = await User.findById(
        (decoded as JwtPayloadType).userId
      ).select("-password");

      if (!user) {
        res.status(401);
        throw new Error("Unauthorized, user not found");
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Unauthorized, no token provided");
  }
});

const admin = asyncHandler(async (req, res, next) => {
  if (req.user && (req.user as any).role === "admin") {
    next();
  } else {
    res.status(401);
    throw new Error("Not enough permissions, admin access required");
  }
});

export { protect, admin };
