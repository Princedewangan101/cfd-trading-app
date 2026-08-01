import axios from "axios";
import { config } from "@/lib/config";

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export const loadInitialData = async (symbol: string, timeFrame: string): Promise<Candle[]> => {
    try {
        const serverResponse = await axios.get<{ candles: Candle[] }>(`http://localhost:5000/api/candles/${symbol}/${timeFrame}`, config)
        // console.log(`> /api/candles/${symbol}/1m`)
        // console.log("> serverResponse : ", serverResponse);

        return serverResponse.data.candles
    } catch {
        return []
    }

};
