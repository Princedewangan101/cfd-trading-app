import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { CustomPayload } from '../../type/authTypeAugmentation';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.token
        if (!token) {
            return res.status(401).json({ success: false, message: "Token not found." })
        }
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, message: "Jwt secret not found." })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as CustomPayload
        if (!decoded.userId) {
            return res.status(401).json({ success: false, message: "Invalid or tampered token." })
        }

        req.userId = decoded.userId
        next()
    } catch (error: any) {
        console.log("\n> [ERROR] (authMiddleware.ts) :", error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
        }
        return res.status(401).json({ success: false, message: "Invalid or tampered token." });
    }
}
