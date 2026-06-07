import * as express from 'express';
import jwt from 'jsonwebtoken';

export interface CustomPayload extends jwt.JwtPayload {
  userId: string;
}

declare global {
    namespace Express {
        interface Request {
            userId: string;
        }
    }
}