import { Time } from "lightweight-charts";

export async function fetchOlderData(symbol: string | null, firstCandle: Time) {
    const validSymbols = ['Sol/Usd', 'Btc/Usd', 'Eth/Usd'];

    if (!symbol || !validSymbols.includes(symbol)) {
        throw new Error(`Symbol "${symbol}" is not supported or is null!`);
    }

    console.log("Fetching data for:", symbol);
    // Your DB logic here...
}