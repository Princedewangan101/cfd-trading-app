import React from 'react'

const DotLoader = () => {
    return (
        <div className="flex items-center justify-center h-120 w-full">
            <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="w-3 h-3 rounded-full bg-zinc-500 animate-dotPulse"
                        style={{ animationDelay: `${i * 0.16}s` }}
                    />
                ))}
            </div>
        </div>
    )
}

export default DotLoader