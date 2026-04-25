import express, { type Request, type Response } from "express";
import "dotenv/config";
import cors from "cors";
import authRouter from "./routes/authRoute.js";
import tradeRoute from "./routes/tradeRoute.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Server is Live!");
});

app.use("/internal/trade", tradeRoute);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT} 🔥`);
});
