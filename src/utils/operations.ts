import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

/**
 * Higher-order function that wraps a route handler to provide MongoDB transaction support
 *
 * @param fn - The route handler function to wrap. Must accept (req, res, session)
 * @returns Async route handler with automatic transaction management
 */
export const withTransaction = (fn: Function) =>
  asyncHandler(async (req, res) => {
    // Start a new MongoDB session
    const session = await mongoose.startSession();

    try {
      // Begin a transaction
      session.startTransaction();

      /**
       * Execute the original route handler with the session
       * - Passes request, response, and active session
       * - All DB operations in handler must use this session
       */
      const result = await fn(req, res, session);

      // Commit transaction if no errors were thrown
      await session.commitTransaction();

      return result;
    } catch (error) {
      // Safety check: Only abort if transaction is still active
      if (session.inTransaction()) {
        // Rollback all operations in the transaction
        await session.abortTransaction();
      }

      // Re-throw error to be handled by asyncHandler/Express
      throw error;
    } finally {
      // Always end session to clean up resources
      // Prevents connection leaks even if commit/abort fails
      session.endSession();
    }
  });
