"use client";

import React from "react";
import { useEffect, useRef } from "react";
import { loadInitialData } from "@/app/utils/loadInitialData";
import { debounce } from "@/app/utils/deBounce";
import { createChart, ColorType, CandlestickSeries, type UTCTimestamp } from "lightweight-charts";
import { chartAdjuster, timeFrame } from "@/lib/timeFrames";
import DotLoader from "./DotLoader";
import DrawerHeader from "./DrawerHeader";
import { barColour } from "@/lib/barColor";
import { dummyData } from "@/lib/candleDummyData";


const Charts = ({ symbol }: { symbol: string }) => {

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isChartReady = useRef<boolean>(false)
  const [isChartLoaded, setIsChartLoaded] = React.useState<boolean>(false);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);
  const [chartTimeFrame, setChartTimeFrame] = React.useState<string>("1m");
  const [clock, setClock] = React.useState<string>("00:00:00");

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

  function chart() {
    if (!chartContainerRef.current) return;

    let disposed = false;

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

    //  FETCH DATA FROM DB
    console.log("FETCH DATA FROM DB...");

    initCandleData()

    async function initCandleData() {
      const result = await loadInitialData(symbolWithUnderScore, chartTimeFrame);
      if (disposed) return;
      const candleData = Array.isArray(result) && result.length > 0 ? result : dummyData;
      // console.log(">>", candleData);
      const formattedData = candleData.map((candle) => {
        return {
          time: Number(candle.time) as UTCTimestamp,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        };
      });
      formattedData.sort((a, b) => a.time - b.time)

      candlestickSeries.setData([...formattedData]);

      isChartReady.current = true

    }

    const socket = updateCandle(symbolWithUnderScore)

    function updateCandle(symbol: string) {
      if (!process.env.NEXT_PUBLIC_BACKPACK_URL) { throw new Error("NEXT_PUBLIC_BACKPACK_URL not found !!!"); }
      const ws: WebSocket = new WebSocket(process.env.NEXT_PUBLIC_BACKPACK_URL)

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            method: "SUBSCRIBE",
            params: [`kline.1m.${symbol}C`],
            id: 1,
          })
        );
      };

      ws.onmessage = (e: MessageEvent) => {
        if (disposed) return;
        const parsedData = JSON.parse(e.data);
        const { o, h, l, c, t } = parsedData.data;
        const time = Math.floor(new Date(t).getTime() / 1000) as UTCTimestamp
        console.log("> t (ws) :", time);

        if (isChartReady.current) {
          candlestickSeries.update({
            time,
            open: Number(o),
            high: Number(h),
            low: Number(l),
            close: Number(c),
          })
        }
      };

      return ws
    }

    // HANDLE LOADING OF OLDER CHART DATA
    const debouncedScroll = debounce(handleScrollLeftOfChart, 1000)

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => { debouncedScroll(); });

    function handleScrollLeftOfChart() {
      const visibleRange = chart.timeScale().getVisibleRange();
      if (!visibleRange) return;  // Visible Range Output: { from: 1714521600, to: 1714953600 }

      if (Number(visibleRange.from) < Number(candlestickSeries.data()[0]?.time) && !isFetching) {
        setIsFetching(true);

        // TODO: HAVE TO FETCH DATA FROM DB
        // const olderData = await fetchOlderData(symbol, visibleRange.from)
        const olderData = dummyData

        const combinedData = [...olderData, ...candlestickSeries.data()]
        candlestickSeries.setData(combinedData);

        setIsFetching(false);
      }
    }

    return () => {
      disposed = true;
      chart.remove();
      socket.close()
    }
  }

  useEffect(() => {
    setIsChartLoaded(false)
    const cleanup = chart()
    setIsChartLoaded(true)
    return cleanup
  }, [symbolWithoutSlash]);



  return (
    <div className="relative flex w-full flex-col bg-zinc-950 px-2 pt-2 rounded">
      {/* CHART */}
      <div ref={chartContainerRef} className="relative z-0 h-[55vh] min-h-[420px]" />

      {!isChartLoaded && (<DotLoader />)}

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
            timeFrame.map(({ time }) => (
              <div
                onClick={() => { setChartTimeFrame(time) }}
                key={time}
                className={`${chartTimeFrame === time && "bg-zinc-800"} flex items-center justify-center text-sm p-1 w-8 h-full rounded-sm hover:bg-zinc-800 hover:cursor-pointer`}>
                {time}
              </div>
            ))
          }
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