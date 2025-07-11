import mongoose from "mongoose";
import { MONGO_URI, NODE_ENV } from "../config/env";

if (!MONGO_URI) {
  throw new Error(
    "Please define MONGO_URI in your environment variables inside .env.<development/production>.local"
  );
}

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI as string);
    console.log(`MongoDB Connected in ${NODE_ENV} mode`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
