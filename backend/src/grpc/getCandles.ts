import grpcClient from "./client";

interface Candle {
    candleStickId: string;
    symbol: string;
    timeFrame: string;
    time: string;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
}

export interface CandlesResponse {
    candles: Candle[];
}

export function getCandles(symbol: string, timeFrame: string, from?: number, take?: number): Promise<CandlesResponse> {
    return new Promise((resolve, reject) => {
        const request: {
            symbol: string;
            timeFrame: string;
            from?: number;
            take?: number;
        } = { symbol, timeFrame };
        if (from !== undefined) request.from = from;
        if (take !== undefined) request.take = take;

        grpcClient.GetCandles(request, (error: any, response: CandlesResponse | undefined) => {
            if (error) {
                console.log("> ERROR (grpcClient.GetCandles) :", error.message);
                reject(error.message)
            }
            if (!response) {
                reject("No response from candle service.")
                return;
            }
            resolve(response)
        })
    })
}
