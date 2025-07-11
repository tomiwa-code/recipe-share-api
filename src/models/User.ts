import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String || null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ["admin", "creator"],
      default: "creator",
    },
    bio: {
      type: String,
      default: "Hey there! I'm using Recipe Share.",
      maxlength: 160,
    },
    location: {
      type: String,
      default: "Earth",
      maxlength: 30,
    },
    stats: {
      recipesShared: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalStar: {
        type: Number,
        default: 0,
        min: 0,
      },
      recipesSaved: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    coverPhoto: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
export default User;
