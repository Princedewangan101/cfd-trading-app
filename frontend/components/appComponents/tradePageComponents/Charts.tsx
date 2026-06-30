"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import React from "react";
import { loadInitialData } from "@/app/utils/loadInitialData";
import { fetchOlderData } from "@/app/utils/fetchOlderData";
import { debounce } from "@/app/utils/deBounce";
import { updateCandle } from "@/app/utils/candleUpdate";
import { chartAdjuster, timeFrame } from "@/lib/timeFrames";
import { useAppStore } from "@/store/store";
import Image from "next/image";
import DrawerHeader from "./DrawerHeader";
import DotLoader from "./DotLoader";


const Charts = ({ symbol }: { symbol: string }) => {

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isChartReady = useRef<boolean>(false)
  const [isChartLoaded, setIsChartLoaded] = React.useState<boolean>(false);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);


  const symbolWithoutSlash = symbol;  // BTCUSD   <- no slash
  const symbolWithUnderScore = `${symbolWithoutSlash.slice(0, -3)}_USD`


  const dummyData = [
    { time: 1717243740, open: 150.00, high: 155.00, low: 148.00, close: 152.50 }, // 2024-06-01 12:09:00 UTC
    { time: 1717243800, open: 152.50, high: 160.00, low: 151.00, close: 158.20 }, // 2024-06-01 12:10:00 UTC
    { time: 1717243860, open: 158.20, high: 165.00, low: 157.00, close: 162.10 }  // 2024-06-01 12:11:00 UTC
  ];

  const barColour = {
    upColor: "#26a69a",
    downColor: "#ef5350",
    borderVisible: false,
    wickUpColor: "#26a69a",
    wickDownColor: "#ef5350",
  }

  function chart() {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#09090b" },
        textColor: "gray",
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 480,
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
      const candleData = await loadInitialData(symbolWithUnderScore, timeFrame);
      // console.log(">>", candleData);
      const formattedData = candleData.map((candle) => {
        return {
          time: Number(candle.time),
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

    // const socket = updateCandle(symbolWithUnderScore)

    async function updateCandle(symbol) {
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

      ws.onmessage = async (e: any) => {
        const parsedData = JSON.parse(e.data);
        const { o, h, l, c, t } = parsedData.data;
        const time = Number(Math.floor(new Date(t).getTime() / 1000))
        console.log("> t (ws) :", time);

        if (isChartReady.current) {
          candlestickSeries.update({
            time: time as any,
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

      if (visibleRange.from < (candlestickSeries.data()[0]?.time as any) && !isFetching) {
        setIsFetching(true);

        // TODO: HAVE TO FETCH DATA FROM DB
        // const olderData = await fetchOlderData(symbol, visibleRange.from)
        const olderData = dummyData

        const combinedData = [...olderData, ...candlestickSeries.data()]
        candlestickSeries.setData(combinedData);

        setIsFetching(false);
      }
    }

    // RESIZING
    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth })
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      // socket.then((ws) => { ws.close() })
    }
  }

  useEffect(() => {
    setIsChartLoaded(false)
    chart()
    setIsChartLoaded(true)
  }, [symbolWithoutSlash]);


  return (
    <div className="relative flex flex-col w-full h-full bg-zinc-950 px-2 pt-2 rounded overflow-hidden">
      {/* CHART */}
      <div ref={chartContainerRef} className="z-0" />

      {!isChartLoaded && (
        <DotLoader/>
      )}

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
            timeFrame.map((tf) => (
              <div
                onClick={() => { useAppStore.setState({ timeFrame: tf }) }}
                key={tf}
                className="flex items-center justify-center text-sm p-1 w-8 h-full rounded-sm hover:bg-zinc-800 hover:cursor-pointer">
                {tf}
              </div>
            ))
          }
        </div>
        <div className="flex gap-1 ml-auto mr-3 h-full">
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

      {/* POSITION DRAWER */}
      <DrawerHeader />
    </div>
  )
}

export default Charts