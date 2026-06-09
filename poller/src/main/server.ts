import "dotenv/config";
import express, {type Request, type Response} from "express";
import { startPoller } from "./poller";
import * as grpc from '@grpc/grpc-js';
import { initGrpc } from "../grpc/server";

const app = express();
// app.use(cors())
app.use(express.json())
startPoller();

app.get("/", (req, res) => {
    res.json({ message: "Hello from the Express TypeScript server!", path: req.path });
});

const port = 5002;
app.listen(port, () => {
  console.log(`server running at ${port}`);
});

const server = new grpc.Server();
initGrpc(server)