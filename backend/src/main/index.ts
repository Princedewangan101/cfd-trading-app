import "dotenv/config";
import express, { type Request, type Response } from "express";
import orderRoutes from './routes/orderRoutes.js'
import onrampRoutes from "./routes/onrampRoute.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
// app.use(cors())
app.use(express.json())
// startPoller();

app.get("/", (res:Response) => { res.json({ message: "server running at 5000 !" }); });

app.use('/order', orderRoutes);
app.use('/onramp', onrampRoutes);
app.use('/user', userRoutes);

const port = 5000;
app.listen(port, () => {
    console.log(`server running at ${port}`);
});
