import { Router } from 'express'
import { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../configs/db.js";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";



const router = Router();


// router.post("/message", async (req: Request, res: Response) => {
//   const { email } = req.body;
//   const token = crypto.randomBytes(20).toString("hex");
//   magicLinks.set(token, email);

//   const magicLink = `${process.env.BACKEND_BASE_URL}/signin/post?token=${token}`;

//   res.status(200).json({ magicLink });
// };)


// router.post("/sign-in", async (req, res) => {
// })


export default router
























