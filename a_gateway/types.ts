import { type Request } from "express";


export interface AuthRequest extends Request {
  userId: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: number; // This makes it compatible with standard Express
      email?: string;
    }
  }
}

export {};