import axios from "axios";
import { config } from "@/lib/config";
import { BACKEND_URL } from "@/lib/url";
import { mapCandles, type Candle } from "@/hooks/useCandles";

export async function fetchOlderData(
    symbol: string,
    timeFrame: string,
    from: number,
    take = 80
): Promise<Candle[]> {
    try {
        const serverResponse = await axios.get(
            `${BACKEND_URL.candles}/${symbol}/${timeFrame}`,
            { ...config, params: { from, take } }
        );
        return mapCandles(serverResponse.data?.candles ?? []);
    } catch {
        return [];
    }
}
