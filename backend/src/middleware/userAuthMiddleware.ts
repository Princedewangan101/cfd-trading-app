import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

import {type AuthRequest} from '../../types.js'

// interface AuthRequest extends Request {
//   userId?: number;
// }

const userAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header missing"
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token missing"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
    };

    req.userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token"
    });
  }
};

export default userAuth;