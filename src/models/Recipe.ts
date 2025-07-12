import mongoose from "mongoose";

const nutritionFactsSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
});

const ingredientsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  amount: {
    type: String,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
});

const instructionsSchema = new mongoose.Schema({
  step: {
    type: String,
    required: true,
  },
});

const recipeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    desc: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    prepTime: {
      type: Number, // in minutes
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    serving: {
      type: Number,
      required: true,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    imageUrl: {
      type: String,
      required: true,
    },
    cuisine: {
      type: String,
      required: true,
    },
    nutritionFacts: [nutritionFactsSchema],
    ingredients: [ingredientsSchema],
    instructions: [instructionsSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for search and filtering
recipeSchema.index({ name: "text", desc: "text", cuisine: "text" });
recipeSchema.index({ difficulty: 1, prepTime: 1, rating: -1 });

const Recipe = mongoose.model("Recipe", recipeSchema);

export default Recipe;
