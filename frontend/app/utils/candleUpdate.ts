// import { WebSocket } from 'ws'

export async function updateCandle(candleStickSeries, symbol) {
    if (!process.env.BACKPACK_URL) { throw new Error("BACKPACK_URL not found !!!"); }
    const ws: WebSocket = new WebSocket(process.env.BACKPACK_URL)

    ws.onopen = () => {
        ws.send(
            JSON.stringify({
                method: "SUBSCRIBE",
                params: [`kline.1m.${symbol}`],
                id: 1,
            })
        );
    };

    ws.onmessage = async (data: any) => {
        const parsedData = JSON.parse(data.toString());
        console.log("parsedData :", parsedData);
        const { o, h, l, c, s, v, t } = parsedData.data;

        candleStickSeries.update({
            time: Math.floor(new Date(t).getTime() / 1000) as any, // Convert to Unix seconds
            open: parseFloat(o),
            high: parseFloat(h),
            low: parseFloat(l),
            close: parseFloat(c),
        })
    };


    return ws
}