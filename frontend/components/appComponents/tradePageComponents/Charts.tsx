"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import React from "react";
import { loadInitialData } from "@/app/utils/loadInitialData";
import { fetchOlderData } from "@/app/utils/fetchOlderData";
import { debounce } from "@/app/utils/deBounce";
import { updateCandle } from "@/app/utils/candleUpdate";
import { chartAdjuster, timeFrame } from "@/lib/timeFrames";


const Charts = () => {

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [symbol, setSymbol] = React.useState<'Sol/Usd' | "Btc/Usd" | "Eth/Usd" | null>(null);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);



  // 3. Prepare Dummy Data
  // const dummyData = [
  //   { time: "2024-05-01", open: 150.00, high: 155.00, low: 148.00, close: 152.50 },
  //   { time: "2024-05-02", open: 152.50, high: 160.00, low: 151.00, close: 158.20 },
  //   { time: "2024-05-03", open: 158.20, high: 165.00, low: 157.00, close: 162.10 },
  //   { time: "2024-05-04", open: 162.10, high: 163.00, low: 155.00, close: 156.40 },
  //   { time: "2024-05-05", open: 156.40, high: 160.00, low: 154.00, close: 159.00 },
  // ];
  const dummyData = [
    { time: "2024-05-01", open: 150.00, high: 155.00, low: 148.00, close: 152.50 },
    { time: "2024-05-02", open: 152.50, high: 160.00, low: 151.00, close: 158.20 },
    { time: "2024-05-03", open: 158.20, high: 165.00, low: 157.00, close: 162.10 },
    { time: "2024-05-04", open: 162.10, high: 163.00, low: 155.00, close: 156.40 },
    { time: "2024-05-05", open: 156.40, high: 160.00, low: 154.00, close: 159.00 },
    ...(() => {
      const list = [];
      let currentClose = 159.00;
      let currentDate = new Date("2024-05-06");

      for (let i = 0; i < 295; i++) { // 295 generated + 5 initial = 300 total
        const open = currentClose;

        // Simulate market noise/volatility
        const change = (Math.random() - 0.49) * 6.5;
        const close = Number((open + change).toFixed(2));

        const highVar = Math.random() * 3.0;
        const lowVar = Math.random() * 3.0;

        const high = Number((Math.max(open, close) + highVar).toFixed(2));
        const low = Number((Math.min(open, close) - lowVar).toFixed(2));

        // Format date to ISO string standard YYYY-MM-DD
        const time = currentDate.toISOString().split('T')[0];

        list.push({ time, open, high, low, close });

        // Advance by 1 calendar day
        currentClose = close;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return list;
    })()
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
      width: chartContainerRef.current.clientWidth,
      height: 508,
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

    candlestickSeries.setData([...dummyData]);

    // TODO: HAVE TO FETCH DATA FROM DB
    // loadInitialData(candlestickSeries);

    const socket = updateCandle(candlestickSeries, symbol)

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
      socket.then((ws) => { ws.close() })
    }
  }

  useEffect(() => {
    chart()
  }, [symbol]);


  return (
    <div className="relative flex flex-col w-full h-full bg-zinc-950 px-2 pt-2 rounded overflow-hidden">
      {/* CHART */}
      <div ref={chartContainerRef} className="z-0" />

      <div className="absolute z-10 top-0 left-4">
        <div className="border px-5">
          flex
        </div>
      </div>
      <div className="absolute z-10 top-0 left-1/2 -translate-x-1/2">

          indicator

      </div>

      {/* T0OLS */}
      <div className="w-full h-full flex">
        <div className="h-full flex gap-1 ml-3">
          {
            timeFrame.map((tf) => (
              <div key={tf} className="flex items-center justify-center text-sm p-1 w-8  h-full rounded-sm hover:bg-zinc-800 hover:cursor-pointer">
                {tf}
              </div>
            ))
          }
        </div>
        <div className="flex gap-1 ml-auto mr-3 h-full">
          {
            chartAdjuster.map((x) =>
              <div key={x} className="h-full p-1 text-sm rounded-sm hover:bg-zinc-800 hover:cursor-pointer">{x}</div>
            )
          }
        </div>


      </div>
    </div>
  )
}

export default Charts