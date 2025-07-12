import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const {
  PORT,
  NODE_ENV,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  CLIENT_URL,
  MONGO_URI,
  DEFAULT_AVATAR,
  DEFAULT_COVER_PHOTO,
  ARCJET_KEY,
  ARCJET_ENV,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;
