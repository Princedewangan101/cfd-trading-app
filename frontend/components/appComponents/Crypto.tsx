"use client";

import React from "react";

interface CryptoIconProps {
    base: string;
    size?: number;
}

const SOL_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
        <circle cx="256" cy="256" r="256" fill="#140047" />
        <defs>
            <linearGradient id="solTopG" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#00FFA3" />
                <stop offset="100%" stop-color="#03E1FF" />
            </linearGradient>
            <linearGradient id="solMidG" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#00FFA3" />
                <stop offset="100%" stop-color="#03E1FF" />
            </linearGradient>
            <linearGradient id="solBotG" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#D722FF" />
                <stop offset="100%" stop-color="#51BCFF" />
            </linearGradient>
        </defs>
        <g transform="translate(138, 164)">
            <path d="M 15.9 44 L 219.7 44 L 235.6 15.4 L 31.8 15.4 Z" fill="url(#solTopG)" />
            <path d="M 15.9 109 L 219.7 109 L 235.6 80.4 L 31.8 80.4 Z" fill="url(#solMidG)" />
            <path d="M 31.8 145.4 L 235.6 145.4 L 219.7 174 L 15.9 174 Z" fill="url(#solBotG)" />
        </g>
    </svg>
);

const ETH_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
        <circle cx="256" cy="256" r="256" fill="#f3f3f3" />
        <g transform="translate(256, 240)">
            <polygon points="0,-120 -60,0 0,-18 60,0" fill="#343434" />
            <polygon points="0,-120 0,-18 -60,0" fill="#8C8C8C" />
            <polygon points="0,0 60,0 0,80" fill="#3C3C3B" />
            <polygon points="0,0 0,80 -60,0" fill="#8C8C8C" />
            <polygon points="0,-26 60,0 0,6 -60,0" fill="#141414" />
        </g>
    </svg>
);

const BTC_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
        <circle cx="256" cy="256" r="256" fill="#f7931a" />
        <g transform="translate(256, 262)">
            <path
                d="M -30 -76 L -30 76 M -30 -66 L -46 -66 L -46 66 L -30 66 M -20 -68 L -20 68 M 6 -70 C 30 -70 46 -58 46 -36 C 46 -18 32 -8 16 -6 C 38 -4 58 10 58 34 C 58 58 36 70 8 70 L -20 70 L -20 -70 Z M -20 -6 L 6 -6 C 22 -6 30 0 30 12 C 30 24 20 28 4 28 L -20 28 Z M -20 36 L 12 36 C 28 36 38 42 38 56 C 38 66 26 70 10 70 L -20 70 Z"
                fill="#fff"
                fill-rule="evenodd"
            />
        </g>
    </svg>
);

const LOGO_BY_BASE: Record<string, React.ReactNode> = {
    BTC: BTC_SVG,
    ETH: ETH_SVG,
    SOL: SOL_SVG,
};

export const CryptoIcon = ({ base, size = 24 }: CryptoIconProps) => {
    const normalized = (base ?? "").toUpperCase();
    const logo = LOGO_BY_BASE[normalized];
    if (!logo) return null;
    return (
        <span
            className="inline-flex shrink-0 overflow-hidden rounded-full"
            style={{ width: size, height: size }}
        >
            {logo}
        </span>
    );
};
