import "dotenv/config";
import express, {type Request, type Response} from "express";
import { startPoller } from "./poller";
import * as grpc from '@grpc/grpc-js';
import { initGrpc } from "../grpc/server";

const server = new grpc.Server();
startPoller().catch(error => {
    console.log("\n> [ERROR] (server.ts) :", error.message);
});

initGrpc(server)