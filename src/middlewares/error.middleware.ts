import { NextFunction, Request, Response } from "express";

// Define strong error types
type AppError = Error & {
  statusCode?: number;
  code?: number;
  keyValue?: { [key: string]: string };
  errors?: Record<string, { message: string }>;
};

const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statusCode = err.statusCode || 500;
    let message = err.message || "Server Error";

    console.error(`[${new Date().toISOString()}] Error:`, {
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method,
    });

    // Handle specific error types
    if (err.name === "CastError") {
      message = "Resource not found.";
    } else if (err.name === "MongoServerError" && err.code === 11000) {
      const field = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
      message = `Duplicate value entered for ${field}. Please use another value.`;
    } else if (err.name === "ValidationError" && err.errors) {
      message = Object.values(err.errors)
        .map((val) => val.message)
        .join(", ");
    }

    res.status(statusCode).json({
      success: false,
      message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
  } catch (error) {
    // Fallback for errors within the error handler
    console.error("CRITICAL: Error in error middleware", error);
    res.status(500).json({
      success: false,
      message: "Critical server failure",
    });
  }
};

export default errorMiddleware;
