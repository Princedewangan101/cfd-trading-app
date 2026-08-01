"use client"

import LeverageSlider from '@/components/ui/LeverageSlider';
import React from 'react'
import axios from 'axios'
import { BACKEND_URL } from '@/lib/url';
import { config } from '@/lib/config';
import { showActionPromise } from '@/lib/toast';


const OrderPanel = ({ symbol }: { symbol: string }) => {
  const [quantity, setQuantity] = React.useState<number | string>("");

  const [leverageSliderValue, setLeverageSliderValue] = React.useState([1, 400])
  const [side, setSide] = React.useState<"BUY" | "SELL" | "PROCESS">("BUY");
  const [orderType, setOrderType] = React.useState<"market" | "limit">("market");

  const markPrice = 67000;
  const notional = markPrice * Number(quantity || 0);
  const marginRequired = leverageSliderValue[1] ? notional / leverageSliderValue[1] : 0;

  function handleSliderValue(selectedValue: number) {
    return setLeverageSliderValue([1, selectedValue])
  }

  function handleOrderSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    formData.append("side", side);
    formData.append("orderType", orderType);
    formData.append("leverage", leverageSliderValue[1].toString());
    formData.append("symbol", symbol);

    const payload = Object.fromEntries(formData.entries());

    console.log("payload :", payload);

    const url = orderType === "market" ? BACKEND_URL.tradeMarket : BACKEND_URL.tradeLimit;
    console.log("url :", url);

    showActionPromise(orderType, () =>
      axios.post(url, { ...payload, ikey: crypto.randomUUID() }, config)
    );
  }

  const inputClass = "w-full rounded-lg bg-zinc-900/70 p-2.5 text-sm text-gray-200 placeholder:text-gray-600 outline-none transition-colors focus:bg-zinc-900/90 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const priceRow = (label: string, value: string) => (
    <div className="flex items-center justify-between text-sm">
      <p className="text-gray-500">{label}</p>
      <p className="tabular-nums text-gray-200">{value}</p>
    </div>
  );

  return (
    <form onSubmit={handleOrderSubmit} className="flex min-w-75 h-fit flex-col gap-4 rounded bg-zinc-950 px-4 py-5">

      {/* ORDER TYPE TOGGLER */}
      <div className="flex w-full gap-1 rounded-lg bg-zinc-900/70 p-1">
        <button
          type="button"
          onClick={() => setOrderType("market")}
          className={`flex-1 rounded-md p-2 text-sm font-medium transition-colors ${orderType === "market" ? "bg-zinc-800 text-gray-100" : "text-gray-400 hover:text-gray-200"}`}
        >
          Market
        </button>
        <button
          type="button"
          onClick={() => setOrderType("limit")}
          className={`flex-1 rounded-md p-2 text-sm font-medium transition-colors ${orderType === "limit" ? "bg-zinc-800 text-gray-100" : "text-gray-400 hover:text-gray-200"}`}
        >
          Limit
        </button>
      </div>

      {/* SIDE TOGGLER */}
      <div className="flex w-full gap-1 rounded-lg bg-zinc-900/70 p-1">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`flex-1 rounded-md p-2 text-sm font-medium transition-colors ${side === "BUY" ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-gray-200"}`}
        >
          Buy/Long
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`flex-1 rounded-md p-2 text-sm font-medium transition-colors ${side === "SELL" ? "bg-red-500 text-white" : "text-gray-400 hover:text-gray-200"}`}
        >
          Sell/Short
        </button>
      </div>

      {/* QUANTITY INPUT BOX */}
      <div>
        <label htmlFor="quantity" className="mb-1.5 block text-sm font-medium text-slate-300">Quantity</label>
        <input
          required
          type="number"
          id="quantity"
          name="quantity"
          placeholder="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* PRICE INPUT BOX */}
      {orderType === "limit" && (
        <div>
          <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-slate-300">Price</label>
          <input type="number" id="price" name="price" placeholder="63867.90" className={inputClass} />
        </div>
      )}

      {/* LEVERAGE SLIDER */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Leverage</label>
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-sm font-semibold tabular-nums text-gray-100">
            {leverageSliderValue[1]}x
          </span>
        </div>
        <LeverageSlider
          value={leverageSliderValue[1]}
          onChange={handleSliderValue}
          min={1}
          max={400}
          marks={[1, 50, 100, 150, 200, 250, 300, 350, 400]}
        />
      </div>

      {/* PRICE DATA BOX */}
      <div className="flex flex-col gap-2 rounded-lg bg-zinc-s px-3 py-2.5">
        {priceRow("Mark Price", `$${markPrice.toLocaleString("en-US")}`)}
        {priceRow("Order Value", `$${notional.toLocaleString("en-US", { maximumFractionDigits: 2 })}`)}
        {priceRow("Margin Required", `$${marginRequired.toLocaleString("en-US", { maximumFractionDigits: 2 })}`)}
        {priceRow("Fee", "$20.00")}
      </div>

      {/* PLACE ORDER BTN */}
      <button
        type="submit"
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 ${side === "BUY" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}
      >
        {side === "BUY" ? "Buy / Long" : "Sell / Short"}
      </button>
    </form>
  )
}

export default OrderPanel
