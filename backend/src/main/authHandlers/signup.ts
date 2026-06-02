import { type Request, type Response } from 'express';
import { prisma } from '../../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


export async function signup(req: Request, res: Response) {
    const { email, userName, password } = req.body;
    if (!email || !userName || !password) {
        return res.status(404).json({ success: true, messge: "Missing reqquired data." })
    }
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
        if (!newUser) {
            return res.status(404).json({ success: false, messge: "Failed to crete user." })
        }

        if (!process.env.JWT_SECRET) {
            return res.status(404).json({ success: false, messge: "Jwt secret not found." })
        }

        const payload = { userId: newUser.userId }
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" })

        res.cookie("token", token, {
            secure: process.env.NODE_ENVIROMENT === "production" ? true : false,
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000
        })

        return res.status(201).json({ success: true, data: { userId:newUser.userId, userName:newUser.userName } })
    } catch (error: any) {
        console.log("ERROR (signup.ts)", `${error.messaage}`);
        return res.status(500).json({ success: false, message: `${error.messaage}` })
    }
}