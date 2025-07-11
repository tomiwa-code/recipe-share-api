import { NextFunction, Request, Response } from "express";

type errorType = {
  name: string;
  message: string;
  stack?: string;
  statusCode?: number;
  code?: number;
  keyValue?: { [key: string]: string };
};

const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let error: errorType = { ...err };

    error.message = err.message;
    console.error(err);

    // Mongoose bad ObjectId
    if (err.name === "CastError") {
      const message = `Resource not found.`;
      error = new Error(message);
      error.statusCode = 404;
    }

    // Mongoose duplicate key
    if (err.name === "MongoServerError" && (err as any).code === 11000) {
      const message = `Duplicate field value entered.`;
      error = new Error(message);
      error.statusCode = 400;
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
      const message = Object.values((err as any).errors)
        .map((val: any) => val.message)
        .join(", ");
      error = new Error(message);
      error.statusCode = 400;
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
