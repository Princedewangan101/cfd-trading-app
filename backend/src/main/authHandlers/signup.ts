import { type Request, type Response } from 'express';
import { prisma } from '../../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const signupSchema = z.object({
    email: z.string().email(),
    userName: z.string().min(3).max(30),
    password: z.string().min(8).max(64),
});

export async function signup(req: Request, res: Response) {
    console.log("\n\n> [INFO] (signup.ts) : signup api called");

    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
        console.log("\n> [ERROR] (signup.ts) : invalid input", parsed.error.issues);
        return res.status(400).json({ success: false, message: "Invalid input." })
    }
    const { email, userName, password } = parsed.data;

    try {
        const isUserExist = await prisma.user.findUnique({
            where: { email }
        })
        if (isUserExist) {
            return res.status(400).json({ success: false, message: "User already exist." })
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                email, userName, password: hashPassword
            }
        })

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, message: "Jwt secret not found." })
        }

        const payload = { userId: newUser.userId }
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" })

        res.cookie("token", token, {
            secure: process.env.NODE_ENV === "production" ? true : false,
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        })

        console.log("\n> [DATA] (signup.ts) :", { userId: newUser.userId, userName: newUser.userName });
        return res.status(201).json({ success: true, data: { userId: newUser.userId, userName: newUser.userName } })
    } catch (error: any) {
        console.log("\n> [ERROR] (signup.ts) :", error.message);
        return res.status(500).json({ success: false, message: `Server error !` })
    }
}
