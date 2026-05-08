import "dotenv/config";
import express, {type Request, type Response} from "express";


const app = express();
// app.use(cors())
app.use(express.json())
// startPoller();

app.get("/", (req, res) => {
    res.json({ message: "Hello from the Express TypeScript server!", path: req.path });
});

const port = 5000;
app.listen(port, () => {
  console.log(`server running at ${port}`);
});
