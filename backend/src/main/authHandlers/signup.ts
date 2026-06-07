import { type Request, type Response } from 'express';
import { prisma } from '../../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


export async function signup(req: Request, res: Response) {
    console.log("signup");

    const { email, userName, password } = req.body;

    console.log(`${email}\n${userName}\n${password}`);

    if (!email || !userName || !password) {
        return res.status(404).json({ success: false, messge: "Missing reqquired data." })
    }
    try {
        const isUserExist = await prisma.user.findUnique({
            where: { email }
        })
        console.log("2");
        if (isUserExist) {
            return res.status(400).json({ success: false, message: "User already exist." })
        }
        const hashPassword = await bcrypt.hash(password, 10);
        console.log("3");
        const newUser = await prisma.user.create({
            data: {
                email, userName, password: hashPassword
            }
        })
        console.log("4");
        if (!newUser) {
            return res.status(404).json({ success: false, messge: "Failed to crete user." })
        }

        if (!process.env.JWT_SECRET) {
            return res.status(404).json({ success: false, messge: "Jwt secret not found." })
        }

        const payload = { userId: newUser.userId }
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" })
        console.log("token : ", token);
        res.cookie("token", token, {
            secure: process.env.NODE_ENVIROMENT === "production" ? true : false,
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        })
        console.log("6");
        return res.status(201).json({ success: true, data: { userId: newUser.userId, userName: newUser.userName } })
    } catch (error: any) {
        console.log("ERROR (signup.ts)", `${error.messaage}`);
        return res.status(500).json({ success: false, message: `Server error !` })
    }
}