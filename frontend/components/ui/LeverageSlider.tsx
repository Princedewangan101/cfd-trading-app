"use client"

import React from "react"

interface LeverageSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  marks?: number[]
}

const LeverageSlider = ({ value, onChange, min = 0, max = 100, step = 1, marks }: LeverageSliderProps) => {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)

  const percentage = min === max ? 0 : ((value - min) / (max - min)) * 100

  function snap(rawValue: number) {
    if (marks && marks.length > 0) {
      return marks.reduce((closest, mark) =>
        Math.abs(mark - rawValue) < Math.abs(closest - rawValue) ? mark : closest
      )
    }
    const stepped = Math.round((rawValue - min) / step) * step + min
    return Math.min(Math.max(stepped, min), max)
  }

  function updateValue(clientX: number) {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    const raw = min + ratio * (max - min)
    onChange(snap(raw))
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
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="absolute h-full rounded-full bg-white" style={{ width: `${percentage}%` }} />
      </div>
      <div
        className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-500 bg-white ring-2 ring-zinc-800/80 transition-[box-shadow] ${isDragging ? "ring-zinc-600/60" : ""}`}
        style={{ left: `${percentage}%` }}
      />
    </div>
  )
}

export default LeverageSlider
