import "dotenv/config";
import express from "express";
import cors from "cors";
import router from "./routes/routes.js";
import { corsOptions } from "../config/corsConfig.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// startPoller();
// handleMessage()

app.use('/api', router);

const port = 5000;
app.listen(port, () => {
    console.log(`server running at ${port}`);
});
