"use client"

import { Slider } from '@/components/ui/slider';
import { orderPanelPriceData } from '@/lib/timeFrames';
import React from 'react'
import axios from 'axios'
import { BACKEND_URL } from '@/lib/url';
import { config } from '@/lib/config';
import { useAppStore } from '@/store/store';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toastConfig';
import { handleError } from '@/app/utils/errorHandler';


const OrderPanel = ({ symbol }: { symbol: string }) => {
  const [quantity, setQuantity] = React.useState<number | string>("");

  const [leverageSliderValue, setLeverageSliderValue] = React.useState([1, 400])
  const [side, setSide] = React.useState<"BUY" | "SELL" | "PROCESS">("BUY");
  const [orderType, setOrderType] = React.useState<"market" | "limit">("market");

  function handleSide() {
    return side === "BUY" ? setSide("SELL") : setSide("BUY")
  }
  function handleOrderType() {
    return orderType === "market" ? setOrderType("limit") : setOrderType("market")
  }
  function handleSliderValue(selectedValue: number[]) {
    return setLeverageSliderValue([1, selectedValue[1]])
  }

  async function handleOrderSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    try {

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
      const serverResponse = await axios.post(url, { ...payload, ikey: crypto.randomUUID() }, config);

      console.log("serverResponse :", serverResponse);

      return toast.success(`Order executed successfully.`, toastConfig)

    } catch (error: any) {
      const errorMessage = handleError(error)
      return toast.error(errorMessage, toastConfig);
    }
  }

  return (
    <>
      <form onSubmit={handleOrderSubmit} className='bg-zinc-950 min-w-75 rounded px-4 py-7 h-fit'>

        {/* ORDER TYPE TOUGGLER */}
        <div className="flex w-full mb-3 bg-zinc-900/70 rounded-md focus:outline-none">
          <p onClick={handleOrderType} className={`w-full text-center p-2 rounded-md ${orderType === "market" && "bg-zinc-800"}`}>Market</p>
          <p onClick={handleOrderType} className={`w-full text-center p-2 rounded-md ${orderType === "limit" && "bg-zinc-800"}`} >Limit</p>
        </div>

        {/* SIDE TOUGGLER */}
        <div className="flex w-full mb-5 bg-zinc-900/70 rounded-md focus:outline-none">
          <p onClick={handleSide} className={`w-full text-center p-2 rounded-md ${side === "BUY" && "bg-green-400"}`}>Buy/Long</p>
          <p onClick={handleSide} className={`w-full text-center p-2 rounded-md ${side === "SELL" && "bg-red-400"}`} >Sell/Short</p>
        </div>


        {/* QUANTITY INPUT BOX */}
        <div>
          <label htmlFor="quantity" className="block mb-1 font-medium text-slate-300">Quantity</label>
          <input required type="number" id="quantity" name="quantity" placeholder="0.01"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full p-2 mb-5 bg-zinc-900/70 rounded-md focus:outline-none 
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        " />
        </div>

        {/* PRICE INPUT BOX */}
        {
          orderType === "limit" &&
          (
            <div>
              <label htmlFor="price" className="block mb-1 font-medium text-slate-300">Price</label>
              <input type="number" id="price" name="price" placeholder="63867.90" className="w-full p-2 mb-5 bg-zinc-900/70 rounded-md focus:outline-none
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            " />
            </div>
          )
        }

        {/* LEVERAGE SLIDER */}
        <div>
          <div className="mx-auto mb-5 grid w-full max-w-xs gap-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="quantity" className="block mb-1 font-medium text-slate-300">Leverage</label>
              <span className="text-sm text-muted-foreground">
                {leverageSliderValue[1]}
              </span>
            </div>
            <Slider
              id="slider-demo-temperature"
              value={leverageSliderValue}
              onValueChange={handleSliderValue}
              min={0}
              max={400}
              step={50}
              className="[&_[data-radix-collection-item]:first-of-type]:first:hidden"
            />
          </div>
        </div>

        {/* PRICE DATA BOX */}
        <div className='px-3 py-1.5 bg-zinc-s text-gray-300 rounded-md'>
          {/* {
            orderPanelPriceData.map(({ title, price }, idx) => (
              <div key={idx} className='text-sm mb-1 flex justify-between'>
                <p>{title}</p>
                <p>{price} <span className='text-xs'>$</span></p>
              </div>
            ))
          } */}
          <div className='text-sm mb-1 flex justify-between'>
            <p>Mark Price</p>
            <p>67000<span className='text-xs'>$</span></p>
          </div>
          <div className='text-sm mb-1 flex justify-between'>
            <p>Order Price</p>
            <p>quantity : {quantity}</p>
            <p>{67000 * Number(quantity)}<span className='text-xs'>$</span></p>
          </div>
          <div className='text-sm mb-1 flex justify-between'>
            <p>Mrgin Required</p>
            <p>{((67000 * Number(quantity)) / leverageSliderValue[1]).toFixed(2)}<span className='text-xs'>$</span></p>
          </div>
          <div className='text-sm mb-1 flex justify-between'>
            <p>Fee</p>
            <p>20<span className='text-xs'>$</span></p>
          </div>
        </div>

        {/* PLACE ORDER BTN */}
        <button type="submit" className={`w-full mt-6 mb-4 px-4 py-2.5 font-medium text-white rounded-md ${side === "BUY" ? "bg-green-400 hover:bg-green-500" : "bg-red-400 hover:bg-red-500"} focus:outline-none`}>
          {side}
        </button>
        {/* <button disabled={isPending ? true : false} type="submit" className={`w-full mt-6 mb-4 px-4 py-2.5 font-medium text-white rounded-md ${side === "BUY" ? "bg-green-400 hover:bg-green-500" : "bg-red-400 hover:bg-red-500"} focus:outline-none`}>
          {isPending ? "..." : side}
        </button> */}
      </form>
    </>
  )
}

export default OrderPanel