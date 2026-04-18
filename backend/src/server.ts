import express, { type Request, type Response } from "express";
import "dotenv/config";
import cors from "cors";
import authRouter from "./routes/authRouter.js";
import userRouter from "./routes/userRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Server is Live!");
});

app.use("/v1/auth", authRouter);
app.use("/v1/user", userRouter);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT} 🔥`);
});
