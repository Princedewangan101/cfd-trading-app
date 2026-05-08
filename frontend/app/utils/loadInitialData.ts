export const loadInitialData = async (candlestickSeries: any) => {
    //  fetch(`/api/history?symbol=${symbol}`)
    const initialData: any = [/* ... your last 100-500 candles ... */];
    return candlestickSeries.setData(initialData);
};