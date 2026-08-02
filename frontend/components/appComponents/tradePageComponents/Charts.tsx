"use client";

import React from "react";
import { useEffect, useRef } from "react";
import { debounce } from "@/app/utils/deBounce";
import { createChart, ColorType, CandlestickSeries, type UTCTimestamp, type IChartApi, type ISeriesApi, type CandlestickData } from "lightweight-charts";
import { chartAdjuster, timeFrame } from "@/lib/timeFrames";
import DotLoader from "./DotLoader";
import DrawerHeader from "./DrawerHeader";
import { ChevronRight } from "lucide-react";
import { barColour } from "@/lib/barColor";
import { useCandles, type Candle } from "@/hooks/useCandles";
import { fetchOlderData } from "@/app/utils/fetchOlderData";

function formatBars(rawCandles: Candle[]) {
    return rawCandles.map((candle) => ({
        time: Number(candle.time) as UTCTimestamp,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
    })).sort((a, b) => a.time - b.time);
}


const Charts = ({ symbol }: { symbol: string }) => {

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const isChartReady = useRef<boolean>(false)
  const isFetchingRef = useRef<boolean>(false)
  const [chartTimeFrame, setChartTimeFrame] = React.useState<string>("1m");
  const [clock, setClock] = React.useState<string>("00:00:00");
  const [isTimeFrameExpanded, setIsTimeFrameExpanded] = React.useState<boolean>(false);

  React.useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);


  const symbolWithoutSlash = symbol;  // BTCUSD   <- no slash
  const symbolWithUnderScore = `${symbolWithoutSlash.slice(0, -3)}_USD`

  const { data: candles = [], isLoading } = useCandles(symbolWithUnderScore, chartTimeFrame);

  const isChartLoaded = !isLoading && candles.length > 0;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#09090b" },
        textColor: "gray",
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chart.applyOptions({
      grid: {
        vertLines: {
          color: '#18181bb2',
        },
        horzLines: {
          color: '#18181bb2',
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, barColour);

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    isChartReady.current = false;

    if (candlesRef.current.length > 0) {
      candlestickSeries.setData(formatBars(candlesRef.current));
      isChartReady.current = true;
    }

    // HANDLE LOADING OF OLDER CHART DATA
    const debouncedScroll = debounce(() => handleScrollLeftOfChart(), 1000)

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => { debouncedScroll(); });

    async function handleScrollLeftOfChart() {
      const series = seriesRef.current;
      const activeChart = chartRef.current;
      if (!series || !activeChart) return;
      const visibleRange = activeChart.timeScale().getVisibleRange();
      if (!visibleRange) return;  // Visible Range Output: { from: 1714521600, to: 1714953600 }

      const currentData = series.data() as CandlestickData<UTCTimestamp>[];
      const firstTime = currentData.length > 0 ? Number(currentData[0].time) : 0;
      if (!firstTime) return;

      if (Number(visibleRange.from) < firstTime && !isFetchingRef.current) {
        isFetchingRef.current = true;

        const olderData = await fetchOlderData(symbolWithUnderScore, chartTimeFrame, firstTime);

        if (olderData.length > 0) {
          const combinedData = [...formatBars(olderData), ...currentData]
          series.setData(combinedData);
        }

        isFetchingRef.current = false;
      }
    }

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }
  }, [symbolWithoutSlash, symbolWithUnderScore, chartTimeFrame]);

  useEffect(() => {
    candlesRef.current = candles;
    if (!seriesRef.current) return;
    seriesRef.current.setData(formatBars(candles));
    isChartReady.current = true;
  }, [candles]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_BACKPACK_URL) return;

    let destroyed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (destroyed) return;
      const ws: WebSocket = new WebSocket(process.env.NEXT_PUBLIC_BACKPACK_URL!)
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            method: "SUBSCRIBE",
            params: [`kline.${chartTimeFrame}.${symbolWithUnderScore}C`],
            id: 1,
          })
        );
      };

      ws.onmessage = (e: MessageEvent) => {
        if (destroyed) return;
        try {
          const parsedData = JSON.parse(e.data);
          const { o, h, l, c, t } = parsedData.data;
          const hasTimeZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(t);
          const time = Math.floor(new Date(hasTimeZone ? t : `${t}Z`).getTime() / 1000) as UTCTimestamp

          if (isChartReady.current && seriesRef.current) {
            seriesRef.current.update({
              time,
              open: Number(o),
              high: Number(h),
              low: Number(l),
              close: Number(c),
            })
          }
        } catch (error) {
          console.log("\n> [ERROR] (Charts.tsx) :", (error as Error).message);
        }
      };

      ws.onclose = () => {
        console.log("\n> [INFO] (Charts.tsx) : ws closed, reconnecting in 1s");
        if (!destroyed) reconnectTimer = setTimeout(connect, 1000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    }
  }, [symbolWithUnderScore, chartTimeFrame]);

  return (
    <div className="relative flex w-full flex-col bg-zinc-950 px-2 pt-2 rounded">
      {/* CHART */}
      <div className="relative h-[55vh] min-h-[420px]">
        <div ref={chartContainerRef} className="absolute inset-0" />

        {!isChartLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/60">
            <DotLoader />
          </div>
        )}
      </div>

      <div className="absolute z-10 top-0 left-4">
        <div className="border px-5">
          flex
        </div>
      </div>

      <div className="absolute z-10 top-0 left-1/2 -translate-x-1/2">
        indicator
      </div>

      {/* TOOLS */}
      <div className="w-full flex bg-zinc-s rounded py-1">
        <div className="h-full flex gap-1 ml-3">
          {
            timeFrame.map(({ time, label }) => {
              const isHidden = !isTimeFrameExpanded && ["4h", "1d", "1w", "1month"].includes(time);
              if (isHidden) return null;
              return (
                <div
                  onClick={() => { setChartTimeFrame(time) }}
                  key={time}
                  className={`${chartTimeFrame === time && "bg-zinc-800"} flex items-center justify-center text-sm p-1 w-8 h-full rounded-sm hover:bg-zinc-800 hover:cursor-pointer`}>
                  {label}
                </div>
              )
            })
          }
          <button
            type="button"
            onClick={() => setIsTimeFrameExpanded((prev) => !prev)}
            className={`flex h-full items-center justify-center p-1 text-sm rounded-sm hover:bg-zinc-800 hover:cursor-pointer transition-transform ${isTimeFrameExpanded ? "rotate-90" : ""}`}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1 ml-auto mr-3 h-full items-center">
          <div className="flex items-center rounded bg-zinc-800 px-2 py-0.5 text-sm tabular-nums text-gray-400">{clock}</div>
          {
            chartAdjuster.map((x) =>
              <div
                key={x}
                className="flex items-center justify-center h-full p-1 text-sm rounded-sm hover:bg-zinc-800 hover:cursor-pointer">
                {x}
              </div>
            )
          }
        </div>
      </div>

      {/* POSITION DRAWER HEADER */}
      <DrawerHeader />

      {/* POSITION DRAWER */}
      {/* <Drawer /> */}
    </div>
  )
}

export default Charts
