import express, { Response } from "express";
import cookieParser from "cookie-parser";
import { CLIENT_URL, PORT } from "./config/env";
import errorMiddleware from "./middlewares/error.middleware";
import authRouter from "./routes/auth.route";
import connectDB from "./utils/mongodb";
import cors from "cors";
import userRouter from "./routes/user.route";
import arcjetMiddleware from "./middlewares/arcjet.middleware";

// CORS configuration
const corsOptions = {
  origin: [CLIENT_URL || "http://localhost:3000"],
  methods: "GET, POST, DELETE, PUT",
  credentials: true,
};

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(arcjetMiddleware);
app.use(errorMiddleware);

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);

// Basic route
app.get("/", (_, res: Response) => {
  res.status(200).json({ message: "API is running 🚀" });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  await connectDB();
});
