"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import React from "react";
import { loadInitialData } from "../utils/loadInitialData";
import { fetchOlderData } from "../utils/fetchOlderData";
import { debounce } from "../utils/deBounce";
import { updateCandle } from "../utils/candleUpdate";


const Charts = async () => {

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [symbol, setSymbol] = React.useState<'Sol/Usd' | "Btc/Usd" | "Eth/Usd" | null>(null);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);



  // 3. Prepare Dummy Data
  const dummyData = [
    { time: "2024-05-01", open: 150.00, high: 155.00, low: 148.00, close: 152.50 },
    { time: "2024-05-02", open: 152.50, high: 160.00, low: 151.00, close: 158.20 },
    { time: "2024-05-03", open: 158.20, high: 165.00, low: 157.00, close: 162.10 },
    { time: "2024-05-04", open: 162.10, high: 163.00, low: 155.00, close: 156.40 },
    { time: "2024-05-05", open: 156.40, high: 160.00, low: 154.00, close: 159.00 },
  ];

  const barColour = {
    upColor: "#26a69a",
    downColor: "#ef5350",
    borderVisible: false,
    wickUpColor: "#26a69a",
    wickDownColor: "#ef5350",
  }

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "white" },
        textColor: "black",
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
    })
    const candlestickSeries = chart.addSeries(CandlestickSeries, barColour);

    // TODO: HAVE TO FETCH DATA FROM DB
    // LOADING OF INITIAL CHART DATA
    loadInitialData(candlestickSeries);

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
        const olderData = fetchOlderData(symbol, visibleRange.from)

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
  }, [symbol]);


  return (

    <div>
      <div ref={chartContainerRef} style={{ position: "relative" }} />;
    </div>

  )
}

export default Charts