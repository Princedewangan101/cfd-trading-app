import { WebSocket } from 'ws';

export interface CustomWebSocket extends WebSocket {
    user?: {
        userId: string;
    };
}