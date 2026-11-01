import React from "react";

export default function PotJarVisual({ balanceEth = "0" }) {
  // Compute fluid level based on balance (min 150, max 240)
  const numericBal = parseFloat(balanceEth) || 0;
  // Visual height scaling
  const waveY = Math.max(120, Math.min(220, 220 - numericBal * 50));

  return (
    <div className="relative w-48 h-64 flex items-center justify-center my-4 transition-transform duration-700 hover:scale-[1.01] select-none">
      {/* Subdued ambient warmth behind jar */}
      <div className="absolute w-72 h-72 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10 transform -translate-y-4" />

      <svg
        className="w-full h-full drop-shadow-sm overflow-visible"
        fill="none"
        viewBox="0 0 200 270"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Fluid Warm Gradient */}
          <linearGradient id="amberLiquid" x1="100" x2="100" y1="140" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffdcbe" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#ffc38a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f5bb83" stopOpacity="0.7" />
          </linearGradient>

          {/* Glass Shimmer */}
          <linearGradient id="glassSheen" x1="45" x2="155" y1="40" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
          </linearGradient>

          <clipPath id="jarInner">
            <path d="M 64 42 C 50 42 42 62 42 90 L 42 208 C 42 238 60 252 100 252 C 140 252 158 238 158 208 L 158 90 C 158 62 150 42 136 42 Z" />
          </clipPath>
        </defs>

        {/* Fluid Interior clipped within jar body */}
        <g clipPath="url(#jarInner)">
          <path
            d={`M 30 ${waveY} Q 65 ${waveY - 6}, 100 ${waveY} T 170 ${waveY} L 170 260 L 30 260 Z`}
            fill="url(#amberLiquid)"
          >
            <animate
              attributeName="d"
              dur="6s"
              repeatCount="indefinite"
              values={`
                M 30 ${waveY} Q 65 ${waveY - 5}, 100 ${waveY} T 170 ${waveY} L 170 260 L 30 260 Z;
                M 30 ${waveY + 1} Q 65 ${waveY + 5}, 100 ${waveY - 1} T 170 ${waveY + 1} L 170 260 L 30 260 Z;
                M 30 ${waveY} Q 65 ${waveY - 5}, 100 ${waveY} T 170 ${waveY} L 170 260 L 30 260 Z
              `}
            />
          </path>

          {/* Meniscus wave */}
          <path
            d={`M 42 ${waveY} Q 100 ${waveY - 6} 158 ${waveY}`}
            fill="none"
            stroke="#815526"
            strokeLinecap="round"
            strokeOpacity="0.35"
            strokeWidth="2"
          >
            <animate
              attributeName="d"
              dur="6s"
              repeatCount="indefinite"
              values={`
                M 42 ${waveY} Q 100 ${waveY - 6} 158 ${waveY};
                M 42 ${waveY + 1} Q 100 ${waveY + 4} 158 ${waveY + 1};
                M 42 ${waveY} Q 100 ${waveY - 6} 158 ${waveY}
              `}
            />
          </path>

          {/* Subtle light reflection */}
          <path d="M 52 70 L 52 230" opacity="0.6" stroke="url(#glassSheen)" strokeLinecap="round" strokeWidth="4" />
        </g>

        {/* Jar Outline - Warm Deep Cocoa */}
        {/* Rim / Lip */}
        <rect x="68" y="24" width="64" height="12" rx="6" fill="#fef9ef" stroke="#24160f" strokeWidth="4.5" />
        {/* Neck */}
        <path d="M 72 36 L 72 44 C 72 44 60 48 54 58" stroke="#24160f" strokeLinecap="round" strokeWidth="4.5" />
        <path d="M 128 36 L 128 44 C 128 44 140 48 146 58" stroke="#24160f" strokeLinecap="round" strokeWidth="4.5" />
        {/* Main Body */}
        <path
          d="M 54 58 C 44 72 42 86 42 104 L 42 206 C 42 238 60 252 100 252 C 140 252 158 238 158 206 L 158 104 C 158 86 156 72 146 58"
          fill="none"
          stroke="#24160f"
          strokeLinecap="round"
          strokeWidth="4.5"
        />
        {/* Soft highlight */}
        <path d="M 148 100 L 148 180" stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.75" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
