import { type Request, type Response } from 'express';
import { prisma } from '../../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const signinSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export async function signin(req: Request, res: Response) {
    console.log("\n\n> [INFO] (signin.ts) : signin api called");

    const parsed = signinSchema.safeParse(req.body);
    if (!parsed.success) {
        console.log("\n> [ERROR] (signin.ts) : invalid input", parsed.error.issues);
        return res.status(400).json({ success: false, message: "Invalid input." })
    }
    const { email, password } = parsed.data;

    try {
        const user = await prisma.user.findUnique({
            where: { email }, select: { userId: true, password: true, userName: true }
        })

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials." })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials." })
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, message: "Jwt secret not found." })
        }

        const payload = { userId: user.userId }
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" })

        res.cookie("token", token, {
            secure: process.env.NODE_ENVIRONMENT === "production" ? true : false,
            httpOnly: true,
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000
        })

        console.log("\n> [DATA] (signin.ts) :", { userId: user.userId, userName: user.userName });
        return res.status(200).json({ success: true, data: { userId: user.userId, userName: user.userName } })

    } catch (error: any) {
        console.log("\n> [ERROR] (signin.ts) :", error.message);
        return res.status(500).json({ success: false, message: `Server error !` })
    }
}
