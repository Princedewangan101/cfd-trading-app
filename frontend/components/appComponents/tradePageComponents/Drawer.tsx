"use client";
import { position, positionHeader } from '@/lib/timeFrames';
import React from 'react'

const Drawer = () => {

  // 2026-06-03T14:22:15Z
  function formateTime(timeAsParam: string) {
    if (timeAsParam === "-") {
      return "-"
    }

    const date = timeAsParam.split("T")[0].split("-")
    const time = timeAsParam.split("T")[1].split(":")

    return `${date[2]},${date[1]},${String(date[0]).slice(-2)},${time[0]},${time[1]}`
  }

  return (
    // <div onClick={handleDrawerOpenClose} className='bg-zinc-950 rounded w-full h-10'>

    <div className='bg-zinc-950 rounded w-220 h-100 mt-1  cursor-default absolute bottom-0  overflow-scroll'>

      <div className='border flex '>
        {
          positionHeader.map((title) => (
            <div key={title} className='border-r my-2 px-4 w-30'>
              {title}
            </div>
          ))
        }
      </div>

      {
        position.map(({ symbol, quantity, side, op, cp, closeTime, sl, tp, pnl, executionTime, status }, idx) => (
          <div key={idx} className='border-l border-r border-b flex '>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-3 '>{symbol}</div>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-3 '>{quantity}</div>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-3 '>{side}</div>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-3 '>{op}</div>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-3 '>{cp}</div>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-2 flex items-center gap-2'>
              {
                closeTime !== "-" ?
                  (
                    <>
                      <div>
                        <span className='text-[10px]'>{formateTime(closeTime).split(",")[0]}</span>
                        /
                        <span className='text-[8px]'>{formateTime(closeTime).split(",")[1]}</span>
                        /
                        <span className='text-[6px]'>{formateTime(closeTime).split(",")[2]}</span>
                      </div>
                      <div>
                        <span className='text-sm mr-0.5'>{formateTime(closeTime).split(",")[3]}</span>
                        :
                        <span className='text-[10px] ml-0.5'>{formateTime(closeTime).split(",")[4]}</span>
                      </div>
                    </>
                  )
                  :
                  ("-")
              }
            </div>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-3 '>{sl}</div>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-3 '>{tp}</div>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-3 '>{pnl}
              {/* {
                <span>
                {String(pnl).split(".")[0]}
              </span>
              <span className='text-[10px]'>
                {String(pnl).split(".")[1]}
              </span>
              } */}
            </div>

            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-2 flex gap-2'>
              {
                executionTime !== "-" ?
                  (
                    <>
                      <div>
                        <span className='text-[10px]'>{formateTime(executionTime).split(",")[0]}</span>
                        /
                        <span className='text-[8px]'>{formateTime(executionTime).split(",")[1]}</span>
                        /
                        <span className='text-[6px]'>{formateTime(executionTime).split(",")[2]}</span>
                      </div>
                      <div>
                        <span className='text-sm mr-0.5'>{formateTime(executionTime).split(",")[3]}</span>
                        :
                        <span className='text-[10px] ml-0.5'>{formateTime(executionTime).split(",")[4]}</span>
                      </div>
                    </>
                  )
                  :
                  ("-")
              }
            </div>
            <div className='border-r text-xs text-gray-300 w-30 my-2 py-1 px-3 '>{status}</div>
          </div>
        ))
      }
    </div>

  )
}

export default Drawer