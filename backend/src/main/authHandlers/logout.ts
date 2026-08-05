import { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { redis } from '../../config/redis.js';
import type { CustomPayload } from '../../type/authTypeAugmentation';

export async function logout(req: Request, res: Response) {
    console.log("\n\n> [INFO] (logout.ts) : logout api called");

    const token = req.cookies?.token;
    if (token && process.env.JWT_SECRET) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET) as CustomPayload;
            if (decoded.jti) {
                const ttlSeconds = decoded.exp
                    ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
                    : 24 * 60 * 60;
                if (ttlSeconds > 0) {
                    await redis.set(`jwt:blacklist:${decoded.jti}`, "1", "EX", ttlSeconds);
                }
            }
        } catch (error: any) {
            console.log("\n> [ERROR] (logout.ts) :", error.message);
        }
    }

    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production" ? true : false,
    });

    console.log("\n> [INFO] (logout.ts) : user logged out");
    return res.status(200).json({ success: true, message: "Logged out." });
}
