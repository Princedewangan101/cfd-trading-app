import { type Request, type Response } from "express";

const clients = new Set<Response>();

export function addClient(res: Response) {
    clients.add(res);
    res.on("close", () => clients.delete(res));
}

export function broadcast(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
        res.write(payload);
    }
}

export function sseHandler(req: Request, res: Response) {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.write("retry: 3000\n\n");
    addClient(res);
}
