import React from 'react'

const DotLoader = () => {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="w-3 h-3 rounded-full bg-zinc-400 animate-dotBounceY"
                        style={{ animationDelay: `${i * 0.16}s` }}
                    />
                ))}
            </div>
        </div>
    )
}

export default DotLoader
