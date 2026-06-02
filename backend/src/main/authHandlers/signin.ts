import { type Request, type Response } from 'express';
import { prisma } from '../../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


export async function signin(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(404).json({ success: true, messge: "Missing reqquired data." })
    }
    try {
        const user = await prisma.user.findUnique({
            where: { email }, select: { userId: true, password: true }
        })
        if (!user) {
            return res.status(404).json({ success: true, message: "Invalid credentials." })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(404).json({ success: true, message: "Invalid credentials." })
        }

        if (!process.env.JWT_SECRET) {
            return res.status(404).json({ success: true, message: "Jwt secret not found." })
        }

        const payload = { userId: user.userId }
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" })

        res.cookie("token", token, {
            secure: process.env.NODE_ENVIROMENT === "production" ? true : false,
            httpOnly:true,
            sameSite:"strict",
            maxAge: 60 * 60 * 1000
        })

        return res.status(200).json({success: true, message: "Login successfully."})

    } catch (error: any) {
        console.log("ERROR (signin.ts)", `${error.messaage}`);
        return res.status(500).json({ success: false, message: `${error.messaage}` })
    }
}