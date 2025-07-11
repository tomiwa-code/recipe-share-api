import mongoose from "mongoose";
import { customAlphabet } from "nanoid";

// Custom alphabet for readable usernames (removed vowels to avoid accidental words)
const usernameAlphabet = "bcdfghjklmnpqrstvwxyz23456789";
export const generateSuffix = customAlphabet(usernameAlphabet, 6); // 6-character suffix

// Generate a sanitized base username from a given string
export const generateUsername = (base: string): string => {
  const sanitized = base
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 20);

  return sanitized || "user";
};

// Generate a unique username by checking the database and appending a suffix if necessary
export const generateUniqueUsername = async (
  base: string,
  model: mongoose.Model<any>,
  session: mongoose.mongo.ClientSession
): Promise<string> => {
  let username = generateUsername(base);
  let exists = await model.findOne({ username }).session(session);

  if (!exists) return username;

  let attempts = 0;
  let newUsername: string;

  do {
    attempts++;
    if (attempts > 10) {
      throw new Error("Failed to generate unique username");
    }

    newUsername = `${username}.${generateSuffix()}`;
    exists = await model.findOne({ username: newUsername }).session(session);
  } while (exists);

  return newUsername;
};
