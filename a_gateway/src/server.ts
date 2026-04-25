import express from "express";
import tradeRoutes from "./routes/tradeRoute";
import { globalRateLimiter } from "./middlewares/globalLimiter";
import { TRADING_RL } from "./middlewares/routesLimiter";

const app = express();
app.use(express.json());

app.use(globalRateLimiter);

app.use("/trade", tradeRoutes);
app.use("/auth", tradeRoutes);
app.use("/money-opr", tradeRoutes);

app.listen(3000, () => {
    console.log("API Gateway running on 3000");
});