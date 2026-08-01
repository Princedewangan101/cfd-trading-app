"use client"

import React from "react"

interface LeverageSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

const LeverageSlider = ({ value, onChange, min = 0, max = 100, step = 1 }: LeverageSliderProps) => {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)

  const percentage = min === max ? 0 : ((value - min) / (max - min)) * 100

  function updateValue(clientX: number) {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    const raw = min + ratio * (max - min)
    const stepped = Math.round((raw - min) / step) * step + min
    onChange(Math.min(Math.max(stepped, min), max))
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsDragging(true)
        updateValue(e.clientX)
      }}
      onPointerMove={(e) => {
        if (isDragging) updateValue(e.clientX)
      }}
      onPointerUp={() => setIsDragging(false)}
      onPointerCancel={() => setIsDragging(false)}
      className="relative flex h-5 w-full cursor-pointer touch-none select-none items-center"
    >
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-500">
        <div className="absolute h-full rounded-full bg-zinc-600" style={{ width: `${percentage}%` }} />
      </div>
      <div
        className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-500 bg-white ring-2 ring-zinc-800/80 transition-[box-shadow] ${isDragging ? "ring-zinc-600/60" : ""}`}
        style={{ left: `${percentage}%` }}
      />
    </div>
  )
}

export default LeverageSlider
