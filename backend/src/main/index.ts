import "dotenv/config";
import express from "express";
import router from "./routes/routes.js";

const app = express();
// app.use(cors())
app.use(express.json())
// startPoller();

app.use('/api', router);

const port = 5000;
app.listen(port, () => {
    console.log(`server running at ${port}`);
});
