import { WebSocketServer } from 'ws';
import { Kafka } from 'kafkajs';
import jwt from 'jsonwebtoken';
import { CustomWebSocket } from '../types';
import createClient from 'ioredis';
import { pub, redis } from '../redis';
import { userConnections } from './userConnRecord';

const wss = new WebSocketServer({ port: 5001 });


wss.on('connection', async (ws, req) => {

    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');

    if (!userId) {
        ws.close(1008, "USER_ID_REQUIRED");
        return;
    }

    userConnections.set(userId, ws);
    console.log(`User ${userId} connected.`);

    ws.on('close', () => {
        userConnections.delete(userId);
        console.log(`User ${userId} disconnected.`);
    });
});





